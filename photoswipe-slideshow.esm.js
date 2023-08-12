/*! Slideshow plugin for PhotoSwipe v5.  https://github.com/dpet23/photoswipe-slideshow */

// Constants
const INT32_MAX = 2147483647; // 2^31 - 1
const SLIDESHOW_DELAY_STORAGE_KEY = 'pswp_delay';
const PROGRESS_BAR_CLASS = 'pswp__progress-bar';
const PROGRESS_BAR_RUNNING_CLASS = 'running';

/**
 * Default settings for the plugin.
 *
 * @property {number} delayMs               Slideshow delay in milliseconds.
 * @property {number} buttonOrder           PhotoSwipe position for the slideshow toggle button.
 * @property {string} progressBarPosition   CSS position for the progress bar (either "top" or "bottom").
 * @property {string} progressBarTransition Acceleration curve of the progress bar.
 */
const defaultOptions = {
    delayMs: 4000,
    buttonOrder: 18, // defaults: counter=5, image=7, zoom=10, info=15, close=20
    progressBarPosition: 'bottom',
    progressBarTransition: 'ease', // start slowly, quickly speed up until the middle, then slow down
};

class PhotoSwipeSlideshow {
    /**
     * Set up PhotoSwipe lightbox event binds.
     *
     * @param {PhotoSwipeLightbox} lightbox PhotoSwipe lightbox instance.
     * @param {object} options              Options to change default behaviour.
     */
    constructor(lightbox, options) {
        this.lightbox = lightbox;
        this.options = {
            ...defaultOptions,
            ...options,
        };

        // Use the stored slideshow length, if it's been saved to Local Storage.
        // Otherwise, use the length specified by the caller, or fall back to the default value.
        this.setSlideshowLength(Number(localStorage.getItem(SLIDESHOW_DELAY_STORAGE_KEY)) || this.options.delayMs);

        // Add custom CSS for the progress bar.
        document.head.insertAdjacentHTML(
            'beforeend',
            `<style>\
                .${PROGRESS_BAR_CLASS} {\
                    position: fixed;\
                    ${this.options.progressBarPosition}: 0;\

                    width: 0;\
                    height: 0;\
                }\

                .${PROGRESS_BAR_CLASS}.${PROGRESS_BAR_RUNNING_CLASS} {\
                    width: 100%;\
                    height: 3px;\

                    transition-property: width;
                    transition-timing-function: ${this.options.progressBarTransition};

                    background: #c00;\
                }\
            </style>`.replace(/  +/g, ''),
        );

        // Set default parameters.
        this.slideshowIsRunning = false;
        this.slideshowTimerID = null;
        this.wakeLockIsRunning = false;
        this.wakeLockSentinel = null;

        // Set up lightbox and gallery event binds.
        this.lightbox.on('init', () => {
            this.init(this.lightbox.pswp);
        });
    }

    /**
     * Set up event binds for the PhotoSwipe lightbox and gallery.
     *
     * @param {PhotoSwipeCore} pswp PhotoSwipe instance.
     */
    init(pswp) {
        // Add UI elements to an open gallery.
        pswp.on('uiRegister', () => {
            // Add a button to the PhotoSwipe UI for toggling the slideshow state.
            pswp.ui.registerElement({
                name: 'playpause-button', // pswp__button--playpause-button
                title: 'Toggle slideshow [Space] Time +/-',
                order: this.options.buttonOrder,
                isButton: true,
                html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32"><use class="pswp__icn-shadow" xlink:href="#pswp__icn-pause"/><use class="pswp__icn-shadow" xlink:href="#pswp__icn-play"/><path id="pswp__icn-play" d="M7.4 25 25 16 7.4 6.6Z" /><path id="pswp__icn-pause" style="display:none" d="m7 7h4l0 18h-4zm14 0h4v18h-4z"/></svg>',
                onClick: (event, el) => {
                    this.setSlideshowState();
                },
            });

            // Add an element for the slideshow progress bar.
            pswp.ui.registerElement({
                name: 'playtime',
                appendTo: 'wrapper', // add to PhotoSwipe's scroll viewport wrapper
                tagName: 'div',
                className: PROGRESS_BAR_CLASS,
            });

            // Add custom keyboard bindings, replacing the default bindings.
            pswp.events.add(document, 'keydown', e => {
                switch (e.code) {
                    case 'Space':
                        this.setSlideshowState();
                        e.preventDefault();
                        break;

                    case 'ArrowUp':
                    case 'NumpadAdd':
                    case 'Equal':
                        this.changeSlideshowLength(1000);
                        e.preventDefault();
                        break;

                    case 'ArrowDown':
                    case 'NumpadSubtract':
                    case 'Minus':
                        this.changeSlideshowLength(-1000);
                        e.preventDefault();
                        break;
                }
            });
        });

        // Close the slideshow when closing PhotoSwipe.
        this.lightbox.on('close', () => {
            if (this.slideshowIsRunning) {
                this.setSlideshowState();
            }
        });
    }

    /**
     * Toggle the slideshow state and switch the button's icon.
     */
    setSlideshowState() {
        // Invert the slideshow state.
        this.slideshowIsRunning = !this.slideshowIsRunning;

        if (this.slideshowIsRunning) {
            // Starting the slideshow: go to next slide after some wait time.
            this.goToNextSlideAfterTimeout();
        } else {
            // Stopping the slideshow: reset the progress bar and timer.
            this.resetSlideshow();
        }

        // Update icon to reflect the slideshow state.
        document.querySelector('#pswp__icn-pause').style.display = this.slideshowIsRunning ? 'inline' : 'none';
        document.querySelector('#pswp__icn-play').style.display = this.slideshowIsRunning ? 'none' : 'inline';

        // Prevent or allow the screen to turn off.
        this.toggleWakeLock();
    }

    /**
     * Update the slideshow length.
     *
     * @param {number} newDelay New slideshow delay, in milliseconds.
     */
    setSlideshowLength(newDelay) {
        // The `setTimeout` function requires a 32-bit positive number, in milliseconds.
        // But 1ms isn't useful for a slideshow, so use a reasonable minimum.
        this.options.delayMs = Math.min(Math.max(newDelay, 1000), INT32_MAX); // 1 sec <= delay <= 24.85 days

        // Save the slideshow length to Local Storage if one of the bounds has been reached.
        // This survives page refreshes.
        if (this.options.delayMs != newDelay) {
            localStorage.setItem(SLIDESHOW_DELAY_STORAGE_KEY, this.options.delayMs);
        }
    }

    /**
     * Change the slideshow timer length.
     *
     * @param {number} delta Amount to change the slideshow length, in milliseconds. Can be positive or negative.
     */
    changeSlideshowLength(delta) {
        // Don't do anything if the slideshow isn't running.
        if (!this.slideshowIsRunning) {
            return;
        }

        // Update the slideshow length and save it to Local Storage.
        this.setSlideshowLength(this.options.delayMs + delta);
        localStorage.setItem(SLIDESHOW_DELAY_STORAGE_KEY, this.options.delayMs);

        // Show the current slideshow length.
        const slideCounterElement = document.querySelector('.pswp__counter');
        if (slideCounterElement) {
            slideCounterElement.innerHTML = this.options.delayMs / 1000 + 's';
        }

        // Restart the slideshow.
        this.goToNextSlideAfterTimeout();
    }

    /**
     * Go to the next slide after waiting some time.
     */
    goToNextSlideAfterTimeout() {
        if (pswp.currSlide.content.isLoading()) {
            // Wait for the media to load, without blocking the page.
            this.slideshowTimerID = setTimeout(() => {
                this.goToNextSlideAfterTimeout();
            }, 200);
        } else {
            // Reset the progress bar and timer.
            this.resetSlideshow();

            // Start the slideshow timer.
            this.slideshowTimerID = setTimeout(() => {
                pswp.next();
                this.goToNextSlideAfterTimeout();
            }, this.options.delayMs);

            // Show the progress bar.
            // This needs a small delay so the browser has time to reset the progress bar.
            setTimeout(() => {
                if (this.slideshowIsRunning) {
                    this.toggleProgressBar({ running: true });
                }
            }, 100);
        }
    }

    /**
     * Show or hide the slideshow progress bar.
     *
     * @param {boolean} running Whether the slideshow is running (keyword-only).
     */
    toggleProgressBar({ running }) {
        const slideshowProgressBarElement = document.querySelector(`.${PROGRESS_BAR_CLASS}`);

        if (running) {
            // Start slideshow
            slideshowProgressBarElement.style.transitionDuration = `${this.options.delayMs / 1000}s`;
            slideshowProgressBarElement.classList.add(PROGRESS_BAR_RUNNING_CLASS);
        } else {
            // Stop slideshow
            slideshowProgressBarElement.classList.remove(PROGRESS_BAR_RUNNING_CLASS);
        }
    }

    /**
     * Set wake lock if supported by the browser.
     * https://caniuse.com/wake-lock
     */
    toggleWakeLock() {
        if (this.wakeLockIsRunning == this.slideshowIsRunning) {
            return;
        }

        if ('keepAwake' in screen) {
            // Use experimental API for older browsers.
            // This is a simple boolean flag.
            screen.keepAwake = this.slideshowIsRunning;
        } else if ('wakeLock' in navigator) {
            // Use the Screen Wake Lock API for newer browsers.

            if (this.wakeLockSentinel) {
                // Release screen wake lock, if a request was previously successful.
                this.wakeLockSentinel.release().then(() => {
                    this.wakeLockSentinel = null;
                });
            } else {
                // Request screen wake lock.
                navigator.wakeLock
                    .request('screen')
                    .then(sentinel => {
                        // Save the reference for the wake lock.
                        this.wakeLockSentinel = sentinel;

                        // Update our state if the wake lock happens to be released by the browser.
                        this.wakeLockSentinel.addEventListener('release', () => {
                            this.wakeLockSentinel = null;
                            this.wakeLockIsRunning = false;
                        });
                    })
                    .catch(e => {}); // ignore errors if wake lock request fails.
            }
        }

        this.wakeLockIsRunning = this.slideshowIsRunning;
    }

    /**
     * Stop the slideshow by resetting the progress bar and timer.
     */
    resetSlideshow() {
        this.toggleProgressBar({ running: false });
        if (this.slideshowTimerID) {
            clearTimeout(this.slideshowTimerID);
            this.slideshowTimerID = null;
        }
    }
}

export default PhotoSwipeSlideshow;

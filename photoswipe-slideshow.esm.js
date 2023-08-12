/*! Slideshow plugin for PhotoSwipe v5.  https://github.com/dpet23/photoswipe-slideshow */

// Constants
const INT32_MAX = 2147483647;  // 2^31 - 1
const SLIDESHOW_DELAY_STORAGE_KEY = 'pswp_delay';
const PROGRESS_BAR_CLASS = 'pswp__progress-bar';
const PROGRESS_BAR_RUNNING_CLASS = 'running';

/**
 * Default settings for the plugin.
 *
 * @property {number} delayMs               Slideshow delay in milliseconds.
 * @property {number} buttonOrder           Position where to place the slideshow toggle button.
 * @property {string} progressBarTransition Acceleration curve of the progress bar.
 */
const defaultOptions = {
    delayMs: 4000,
    buttonOrder: 18, // default: counter=5, image=7, zoom=10, info=15, close=20
    progressBarTransition: 'ease', // start slowly, speed up until the middle, then slow down
};

class PhotoSwipeSlideshow {

    /**
     * Set up PhotoSwipe lightbox event binds.
     *
     * @param {PhotoSwipeLightbox} lightbox PhotoSwipe lightbox instance.
     * @param {object} options              Options to change default behaviour.
     */
    constructor(lightbox, options) {
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
            (
                `<style>\
                    .${PROGRESS_BAR_CLASS} {\
                        position: fixed;\
                        bottom: 0;\

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
                </style>`
            ).replace(/  +/g, ''),
        );

        // Set default parameters.
        this.wakeLockIsRunning = false;
        this.wakeLockSentinel = null;
        this.slideshowIsRunning = false;
        this.slideshowTimerID = 0;
        this.lightbox = lightbox;

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

            // Add custom keyboard bindings.
            pswp.events.add(document, 'keydown', e => {
                switch (e.code) {
                    case 'Space':
                        this.setSlideshowState();
                        break;

                    case 'ArrowUp':
                    case 'NumpadAdd':
                    case 'Equal':
                        this.timer(1000);
                        break;

                    case 'ArrowDown':
                    case 'NumpadSubtract':
                    case 'Minus':
                        this.timer(-1000);
                        break;
                }

                // Don't call the default binding for the key.
                e.preventDefault();
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
            this.timer();
        } else {
            // Stopping the slideshow: reset the progress bar and timer.
            this.resetSlideshow();
        }

        // Update icon to reflect the slideshow state.
        document.querySelector('#pswp__icn-pause').style.display = this.slideshowIsRunning ? 'inline' : 'none';
        document.querySelector('#pswp__icn-play').style.display = this.slideshowIsRunning ? 'none' : 'inline';

        // Toggle wake lock: prevent/allow the screen to turn off.
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
        this.options.delayMs = Math.min(Math.max(newDelay, 1000), INT32_MAX);  // 1 sec <= delay <= 24.85 days

        // Save the slideshow length to Local Storage if one of the bounds has been reached.
        // This survives page refreshes.
        if (this.options.delayMs != newDelay) {
            localStorage.setItem(SLIDESHOW_DELAY_STORAGE_KEY, this.options.delayMs);
        }
    }

    /**
     * Manage the slideshow timer.
     *
     * @param {number | undefined} lengthDelta Amount to change the slideshow length, in milliseconds.
     */
    timer(lengthDelta) {
        this.resetSlideshow();

        // Don't restart the timer if the slideshow isn't running.
        if (!this.slideshowIsRunning) {
            return;
        }

        // Change the slideshow length.
        if (lengthDelta) {
            // Update the slideshow length and save it to Local Storage.
            this.setSlideshowLength(this.options.delayMs + lengthDelta);
            localStorage.setItem(SLIDESHOW_DELAY_STORAGE_KEY, this.options.delayMs);

            // Show the current slideshow length.
            const slideCounterElement = document.querySelector('.pswp__counter');
            if (slideCounterElement) {
                slideCounterElement.innerHTML = this.options.delayMs/1000 + 's';
            }
        }

        if (pswp.currSlide.content.isLoading()) {
            this.slideshowTimerID = setTimeout(() => {this.timer()}, 200);
        } else {
            // Start the slideshow timer and go to the next slide.
            this.slideshowTimerID = setTimeout(() => {this.timer()}, this.options.delayMs);
            setTimeout(() => {
                this.toggleProgressBar({running: true});
            }, 100); // need a small delay so the browser has time to reset the progress bar
            if (!lengthDelta) {
                pswp.next();
            }
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
        this.toggleProgressBar({running: false});
        if (this.slideshowTimerID) {
            clearTimeout(this.slideshowTimerID);
            this.slideshowTimerID = null;
        }
    }
}

export default PhotoSwipeSlideshow;

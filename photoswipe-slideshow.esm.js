/**
 * Slideshow plugin for the PhotoSwipe v5
 *
 * Inspired by https://github.com/dimsemenov/PhotoSwipe/issues/753
 *
 * https://github.com/dpet23/photoswipe-slideshow
 */

const defaultOptions = {
    delayMs: 1000,
    buttonTitle: 'Toggle slideshow',
    buttonOrder: 6,  // default: counter=5, image=7, zoom=10, info=15, close=20
    showProgressBar: true,
};

export default class PhotoSwipeSlideshow {
    slideshow_is_running = false;
    slideshowButtonSVG =
        '<svg class="pswp__icn" viewBox="0 0 32 42.667">' +
        // Icon outlines
        '<use class="pswp__icn-shadow" xlink:href="#pswp__slideshow-icn-play"/>' +
        '<use class="pswp__icn-shadow" xlink:href="#pswp__slideshow-icn-stop"/>' +
        // Play icon
        '<path id="pswp__slideshow-icn-play" transform="translate(6,6)" style="scale:0.8;" d="M6.083 3.25c-1.233 -0.758 -2.783 -0.783 -4.042 -0.075S0 5.217 0 6.667V36c0 1.45 0.783 2.783 2.042 3.492s2.808 0.675 4.042 -0.075L30.083 24.75c1.192 -0.725 1.917 -2.017 1.917 -3.417s-0.725 -2.683 -1.917 -3.417L6.083 3.25z" />' +
        // Stop icon
        '<path id="pswp__slideshow-icn-stop" transform="translate(6,6)" style="scale:0.8; display:none;" d="M0 10.667C0 7.725 2.392 5.333 5.333 5.333H26.667c2.942 0 5.333 2.392 5.333 5.333V32c0 2.942 -2.392 5.333 -5.333 5.333H5.333c-2.942 0 -5.333 -2.392 -5.333 -5.333V10.667z" />' +
        '</svg>';
    slideshowProgressBarElement = null;
    slideshowProgressBarWidth = 0;
    slideshowProgressBarWidthMax = 100;
    slideshowProgressBarUpdateIntervalMs = 100;
    slideshowProgressBarIntervalID = 0;

    /**
     * Set up PhotoSwipe lightbox event binds.
     *
     * @param {PhotoSwipeLightbox} lightbox PhotoSwipe lightbox instance.
     * @param {Object} options              Options to change default behaviour.
     */
    constructor(lightbox, options) {
        this.options = {
            ...defaultOptions,
            ...options
        };

        this.lightbox = lightbox;

        // Set up lightbox and gallery event binds.
        this.initLightboxEvents();
        lightbox.on('init', () => {
            this.pswp = lightbox.pswp;
            this.initGalleryEvents();
        });
    }

    /**
     * Set up PhotoSwipe lightbox event binds.
     */
    initLightboxEvents = () => {
        const { lightbox, goToNextSlideAfterTimeout } = this;

        // When slide is switched by the slideshow, start a timer for switching to the next slide.
        lightbox.on('change', () => {
            if (this.slideshow_is_running) {
                goToNextSlideAfterTimeout();
            }
        });

        // Close the slideshow when closing PhotoSwipe.
        lightbox.on('close', () => {
            this.slideshow_is_running = false;
            this.resetProgressBar();
        });
    }

    /**
     * Set up PhotoSwipe gallery event binds.
     */
    initGalleryEvents = () => {
        const { pswp, options, slideshowButtonSVG, setSlideshowState } = this;

        // Add UI elements to an open gallery.
        pswp.on('uiRegister', () => {
            // Add a button to the PhotoSwipe UI for toggling the slideshow state.
            pswp.ui.registerElement({
                name: 'slideshow',  // button.pswp__button--slideshow
                title: options.buttonTitle,
                order: options.buttonOrder,
                isButton: true,
                html: slideshowButtonSVG,
                onClick: (event, buttonElement) => {
                    setSlideshowState();
                }
            });

            // Add a slideshow progress bar to the PhotoSwipe UI.
            if (options.showProgressBar) {
                pswp.ui.registerElement({
                    name: 'slideshow-progress-bar',  // div.pswp__slideshow-progress-bar
                    appendTo: 'wrapper',
                    onInit: (progressBarElement, pswpInstance) => {
                        this.slideshowProgressBarElement = progressBarElement;
                        this.setProgressBarWidth(0);
                    },
                });
            }
        });
    };

    /**
     * Toggle the slideshow state and switch the button's icon.
     */
    setSlideshowState = () => {
        // Update the slideshow running state.
        this.slideshow_is_running = !this.slideshow_is_running;

        if (this.slideshow_is_running) {
            // Starting the slideshow: go to next slide after some wait time.
            // The `change` listener triggers further timers.
            this.goToNextSlideAfterTimeout();
        } else {
            // Stopping the slideshow: reset the progress bar.
            this.resetProgressBar();
        }

        // Update icon to show the slideshow running state.
        document.getElementById('pswp__slideshow-icn-play').style.display = (
            this.slideshow_is_running ? "none" : "inline-block"
        );
        document.getElementById('pswp__slideshow-icn-stop').style.display = (
            this.slideshow_is_running ? "inline-block" : "none"
        );
    }

    /**
     * Go to the next slide, if the slideshow is currently running.
     */
    goToNextSlideAfterTimeout = () => {
        const { getTimeout, animateProgressBar } = this;

        const nextSlideTimeout = getTimeout();

        setTimeout(() => {
            if (this.slideshow_is_running) {
                pswp.next();
            }
        }, nextSlideTimeout);

        animateProgressBar(nextSlideTimeout);
    }

    /**
     * Calculate the time before going to the next slide.
     *
     * For images, use the default delay time.
     * For videos, calculate the remaining duration.
     *
     * @return {number} Timeout value in milliseconds.
     */
    getTimeout = () => {
        const { pswp, options } = this;

        const slideContent = pswp.currSlide.content;
        const isVideoContent = (slideContent && slideContent.data && slideContent.data.type === 'video');

        // Calculate remaining duration for videos.
        if (isVideoContent) {
            const duration = slideContent.element.duration;
            const currentTime = slideContent.element.currentTime;

            if (isNaN(duration) || isNaN(currentTime)) {
                // Fall back to default delay if video hasn't been loaded yet.
                return options.delayMs;
            }
            return (duration - currentTime) * 1000;
        }

        // Use the default delay for images.
        return options.delayMs;
    }

    /**
     * Progressively fill the slideshow progress bar as the slide timer progresses.
     *
     * @param {number} nextSlideTimeout The time before going to the next slide, in milliseconds.
     */
    animateProgressBar = (nextSlideTimeout) => {
        const { options, resetProgressBar, slideshowProgressBarWidthMax, slideshowProgressBarUpdateIntervalMs, stopProgressbar, setProgressBarWidth } = this;

        if (options.showProgressBar) {
            // Ensure the progress bar starts in a clean state for this slide.
            resetProgressBar();

            // Calculate the amount to progress the bar in each step.
            // Use (timeout - an interval) as the total, to ensure we see the bar at 100%.
            const progressBarIncreaseAmount =
                slideshowProgressBarWidthMax /
                ((nextSlideTimeout - slideshowProgressBarUpdateIntervalMs) / slideshowProgressBarUpdateIntervalMs);

            // Start a timer to slowly fill in the progress bar.
            this.slideshowProgressBarIntervalID = setInterval(() => {
                if (this.slideshowProgressBarWidth >= slideshowProgressBarWidthMax) {
                    // Bar has been filled, stop the animation.
                    stopProgressbar();
                } else {
                    // Still need to wait for the next slide, fill in a bit of the progress bar.
                    setProgressBarWidth(this.slideshowProgressBarWidth + progressBarIncreaseAmount);
                }
            }, slideshowProgressBarUpdateIntervalMs);
        }
    }

    /**
     * Set the width of the slideshow progress bar.
     *
     * @param {number} width The new width, as a percentage.
     */
    setProgressBarWidth = (width) => {
        this.slideshowProgressBarWidth = width;
        this.slideshowProgressBarElement.style.width = `${width}%`;
    }

    /**
     * Stop animating the progress bar by clearing the timed function calls.
     */
    stopProgressbar = () => {
        clearInterval(this.slideshowProgressBarIntervalID);
    }

    /**
     * Fully reset the progress bar: stop the animation and reset the width.
     */
    resetProgressBar = () => {
        if (this.options.showProgressBar) {
            this.stopProgressbar();
            this.setProgressBarWidth(0);
        }
    }
}

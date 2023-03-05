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
    buttonOrder: 8,
};

export default class PhotoSwipeSlideshow {
    slideshow_is_running = false;
    buttonSVG =
        '<svg class="pswp__icn" viewBox="0 0 32 42.667">' +
        // Icon outlines
        '<use class="pswp__icn-shadow" xlink:href="#pswp__slideshow-icn-play"/>' +
        '<use class="pswp__icn-shadow" xlink:href="#pswp__slideshow-icn-stop"/>' +
        // Play icon
        '<path id="pswp__slideshow-icn-play" transform="translate(6,6)" style="scale:0.8;" d="M6.083 3.25c-1.233 -0.758 -2.783 -0.783 -4.042 -0.075S0 5.217 0 6.667V36c0 1.45 0.783 2.783 2.042 3.492s2.808 0.675 4.042 -0.075L30.083 24.75c1.192 -0.725 1.917 -2.017 1.917 -3.417s-0.725 -2.683 -1.917 -3.417L6.083 3.25z" />' +
        // Stop icon
        '<path id="pswp__slideshow-icn-stop" transform="translate(6,6)" style="scale:0.8; display:none;" d="M0 10.667C0 7.725 2.392 5.333 5.333 5.333H26.667c2.942 0 5.333 2.392 5.333 5.333V32c0 2.942 -2.392 5.333 -5.333 5.333H5.333c-2.942 0 -5.333 -2.392 -5.333 -5.333V10.667z" />' +
        '</svg>';

    constructor(lightbox, options) {
        this.options = {
            ...defaultOptions,
            ...options
        };
    
        this.lightbox = lightbox;
    
        this.lightbox.on('init', () => {
            this.pswp = this.lightbox.pswp;
            this.initPlugin();
        });
    }
  
    initPlugin = () => {
        const { pswp, options, buttonSVG } = this;

        pswp.on('uiRegister', () => {
            pswp.ui.registerElement({
                name: 'slideshow',
                title: options.buttonTitle,
                order: options.buttonOrder,  // default: counter=5, image=7, zoom=10, info=15, close=20
                isButton: true,
                html: buttonSVG,
                onClick: (event, buttonElement) => {
                    this.setSlideshowState();
                }
            });
        });
    }

    /**
     * Toggle the slideshow state and switch the button's icon.
     */
    setSlideshowState = () => {
        this.slideshow_is_running = !this.slideshow_is_running;

        document.getElementById('pswp__slideshow-icn-play').style.display = (
            this.slideshow_is_running ? "none" : "inline-block"
        );
        document.getElementById('pswp__slideshow-icn-stop').style.display = (
            this.slideshow_is_running ? "inline-block" : "none"
        );
    }
}

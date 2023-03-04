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
        const { pswp, options } = this;

        pswp.on('uiRegister', () => {
            pswp.ui.registerElement({
                name: 'slideshow',
                title: options.buttonTitle,
                order: options.buttonOrder,  // default: counter=5, image=7, zoom=10, info=15, close=20
                isButton: true,
                html: '<i class="fa-solid fa-play"></i>',
                onClick: (event, buttonElement) => {
                    this.setSlideshowState(buttonElement);
                }
            });
        });
    }

    /**
     * Toggle the slideshow state and switch the button's icon.
     */
    setSlideshowState = (buttonElement) => {
        this.slideshow_is_running = !this.slideshow_is_running;

        const icon = buttonElement.getElementsByTagName("i")[0];
        icon.classList.remove(this.slideshow_is_running ? "fa-play" : "fa-stop");
        icon.classList.add(this.slideshow_is_running ? "fa-stop" : "fa-play");
    }
}

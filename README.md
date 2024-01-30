# PhotoSwipe Slideshow plugin

Slideshow plugin for [PhotoSwipe](https://photoswipe.com/) v5

**[> Plugin demo <](https://codepen.io/dpet23/pen/dywPbGy)**

## Initialization

The plugin has a single JS file that must be imported.

It can be initialized like this:

```html
<script type="module">
import PhotoSwipeLightbox from 'photoswipe/dist/photoswipe-lightbox.esm.min.js';
import PhotoSwipeSlideshow from 'photoswipe-slideshow/photoswipe-slideshow.esm.min.js';

const lightbox = new PhotoSwipeLightbox({
  gallerySelector: '#gallery',
  childSelector: '.pswp-gallery__item',
  pswpModule: () => import('photoswipe/dist/photoswipe.esm.js'),
});

const _slideshowPlugin = new PhotoSwipeSlideshow(lightbox, {
  // Plugin options, for example:
  defaultDelayMs: 4000, // 4 sec
});

lightbox.init();
</script>
```

### Plugin options

#### `defaultDelayMs: 4000`

Slideshow delay in milliseconds.

Must be a number between `1000` (1 second) and `2147483647` (approximately 24.85 days).

If using the [Video plugin](https://github.com/dimsemenov/photoswipe-video-plugin),
note that slides with playing video will use the video's remaining length as the slideshow delay.

#### `playPauseButtonOrder: 6`

Where to place the slideshow toggle button, relative to other toolbar items.

By default, it's placed next to the slide counter.
See [PhotoSwipe's API](https://photoswipe.com/adding-ui-elements/#uiregisterelement-api) for the order of the default elements.

#### `progressBarPosition: 'top'`

Position for the progress bar.

Must be either `top` or `bottom`.

#### `progressBarTransition: 'ease'`

Progress bar animation.

See https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function for supported values.
The `ease` animation starts slowly, quickly speeds up until the middle, then slows down.

Slides with image content will use this animation, while
slides with video content will use a `linear` transition, to match a video player's seekbar.

#### `restartOnSlideChange: true`

Whether slide changes should restart the timer.

This is useful if manual slide changes are expected during a slideshow,
especially if mixing image and video content.

#### `autoHideProgressBar: true`

Whether the progress bar can be hidden by the [Auto Hide UI plugin](https://github.com/arnowelzel/photoswipe-auto-hide-ui).

## Added HTML elements

The plugin adds elements with the following CSS attributes:

* `.pswp__button--playpause-button`: A button for starting or stopping the slideshow

* `.pswp__progress-bar`: The slideshow progress bar
  * `.pswp__progress-bar.running`: The progress bar while the slideshow is running

## Keyboard bindings

* `Space`: Start or stop the slideshow

* `+`/`-` or the Up/Down arrow keys: Change the slideshow playback speed by 1 second

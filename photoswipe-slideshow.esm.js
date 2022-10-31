// PhotoSwipe slideshow plugin v1.2
// https://github.com/htmltiger/photoswipe-slideshow


class PhotoSwipeSlideshow {
    constructor(lightbox, time) {
        this.state = -1;
        this.timert = 0;
        this.time = time ? time : 4000;
        this.lightbox = lightbox;
        this.lightbox.on('init', () => {
            this.init(this.lightbox.pswp);
        });
    }

    init(pswp) {
        pswp.on('uiRegister', () => {
            pswp.ui.registerElement({
                name: "playpause-button",
                title: "Play/Pause [Space]",
                order: 18,
                isButton: true,
                html: '<svg viewBox="-40 -40 600 600" aria-hidden="true" class="pswp__icn"><path  class="pswp__icn-play" d="M 110,420 440,250 110,78 v 172 z"/><path class="pswp__icn-pause" d="m 340,87 h 90 V 420 H 340 Z M 99,87 h 91 V 420 H 99 Z" style="display:none"/></svg>',
                onClick: (event, el) => {
                    this.player();
                }
            });
            pswp.ui.registerElement({ //TODO
                name: "playtime",
                className: "pswp__time",
                appendTo: "wrapper",
            });
            pswp.events.add(document, 'keydown', (e) => {
                if (e.keyCode == 32) { //spacebar
                    this.player();
                    e.preventDefault();
                }
            });
        });
        this.lightbox.on('close', () => {
            if (this.state > 0) {
                this.player();
            }
        });
    }

    player() {
        if (this.state < 0) {
            var t = this;
            setTimeout(function () {
                t.stimer();
            }, 600);
            t.state = 0;
        } else {
            this.stimer();
        }
    }
    stimer() {
        this.state = this.state ? 0 : 1;
        if (!this.state) {
            clearTimeout(this.timert);
        } else {
            this.timer();
        }
        document.querySelector('.pswp__icn-pause').style.display = this.state ? 'inline' : 'none';
        document.querySelector('.pswp__icn-play').style.display = this.state ? 'none' : 'inline';
    }

    timer() {
        this.timert = setTimeout(this.timer.bind(this), this.time);
        pswp.next();
    };
}

export default PhotoSwipeSlideshow;

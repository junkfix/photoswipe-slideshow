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
                html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32" width="32" height="32"><use class="pswp__icn-shadow" xlink:href="#pswp__icn-pause"/><use class="pswp__icn-shadow" xlink:href="#pswp__icn-play"/><path  class="pswp__icn-play" id="pswp__icn-play" d="M 6.3,25 C 13,22 19,19 26,16 19,12 13,9.9 6.3,7 Z" /></g><path class="pswp__icn-pause" id="pswp__icn-pause" style="display:none" d="m 21,6.6 h 5 V 25 H 21 Z M 6.4,6.6 H 11 V 25 H 6.4 Z"/></svg>',
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

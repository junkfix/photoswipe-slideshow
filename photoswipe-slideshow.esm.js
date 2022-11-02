/*! PhotoSwipe slideshow plugin v1.5  https://github.com/htmltiger/photoswipe-slideshow */


class PhotoSwipeSlideshow {
    constructor(lightbox, time) {
        document.head.insertAdjacentHTML("beforeend", '<style>.pswp__timer{height:3px;background:#c00;width:0;position:fixed;bottom:0}.load .pswp__timer{width:100%}</style>');
        this.swake = false;
        this.wakeo = null;
        this.state = -1;
        this.timert = 0;
        this.time = time ? time : 4;
        this.lightbox = lightbox;
        this.lightbox.on('init', () => {
            this.init(this.lightbox.pswp);
        });
    }

    init(pswp) {
        pswp.on('uiRegister', () => {
            pswp.ui.registerElement({
                name: "playpause-button",
                title: "Play [Space] Time +/-",
                order: 18,
                isButton: true,
                html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32" width="32" height="32"><use class="pswp__icn-shadow" xlink:href="#pswp__icn-pause"/><use class="pswp__icn-shadow" xlink:href="#pswp__icn-play"/><path id="pswp__icn-play" d="M 7.4,25 25,16 7.4,6.6 Z" /><path id="pswp__icn-pause" style="display:none" d="M 7 7 H 11 L 11 25 H 7 Z m 14 0 h 4 V 25 h -4 z"/></svg>',
                onClick: (event, el) => {
                    this.player();
                }
            });
            pswp.ui.registerElement({
                name: "playtime",
                className: "pswp__time",
                appendTo: "wrapper",
            });
            pswp.events.add(document, 'keydown', (e) => {
                const k = e.keyCode;
                if (k == 32) {
                    this.player();
                    e.preventDefault();
                }
                if (k == 38 || k == 107 || k == 187) {
                    this.time = Math.max(1, ++this.time);
                    this.timer(1);
                }
                if (k == 40 || k == 109 || k == 189) {
                    this.time = Math.max(1, --this.time);
                    this.timer(1);
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
    stimer(h) {
        this.state = this.state ? 0 : 1;
        if (!this.state) {
            this.bar(0);
            clearTimeout(this.timert);
            this.timert = null;
        } else {
            this.timer();
        }
        document.querySelector('#pswp__icn-pause').style.display = this.state ? 'inline' : 'none';
        document.querySelector('#pswp__icn-play').style.display = this.state ? 'none' : 'inline';
        this.wake(this.state);
    }

    timer(k) {
        this.bar(0);
        if (this.timert) {
            clearTimeout(this.timert);
            this.timert = null;
        }
        if (!this.state) {
            return;
        }
        if (!pswp.currSlide.content.isLoading()) {
            this.timert = setTimeout(this.timer.bind(this), (this.time * 1000));
            if (!k) {
                pswp.next();
            }
            this.bar(2);
        } else {
            this.timert = setTimeout(this.timer.bind(this), 200);
        }
    };

    bar(a, b) {
        b = document.querySelector('.pswp__time');
        if (a) {
            if (a == 2) {
                b.innerHTML = '<div class="pswp__timer" style="transition:width ' + this.time + 's;"></div>';
                setTimeout(this.bar.bind(this), 100, 1);
                return;
            }
            b.classList.add('load');
        } else {
            b.innerHTML = '';
            b.classList.remove('load');
        }
    }

    wake(n) {
        if (this.swake == n) {
            return;
        }
        if ("keepAwake" in screen) {
            screen.keepAwake = n;
        } else if ("wakeLock" in navigator) {
            if (this.wakeo) {
                this.wakeo.release();
                this.wakeo = null;
            } else {
                navigator.wakeLock.request('screen')
                .then((w) => {
                    this.wakeo = w;
                    this.wakeo.addEventListener('release', () => {
                        this.wakeo = null;
                        this.swake = false;
                    })
                })
                .catch((e) => {})
            }
        }
        this.swake = n;
    }
}

export default PhotoSwipeSlideshow;

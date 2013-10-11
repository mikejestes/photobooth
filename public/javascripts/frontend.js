(function () {

    var transitions = {
        // flashes the entire screen white, swaps out images, and fades out the whiteness
        // you know, like a flash.
        flash: function($container, $new, done) {

            var $flash = $container.find('.flash');
            if (!$flash.length) {
                $flash = $('<span class="flash"></span>')
                    .css({ opacity: 0 })
                    .appendTo($container);
            }

            $flash.animate({ opacity: 1 }, 100, function() {
                $container.children('.img').not($new).stop().remove();
                $new.appendTo($container);
                $flash.animate({ opacity: 0 }, 1500, function() {
                    if (done) {
                        done();
                    }
                });
            });

        },
        // Fades in new image while fading out the old one
        crossFade: function($container, $new, duration, done) {

            var $old = $container.children('.img');

            $new.css('opacity', 0).appendTo($container);

            $old.stop().animate({ opacity: 0 }, duration);

            $new.animate({ opacity: 1 }, duration, function() {
                $old.remove();
                if (done) {
                    done();
                }
            });

        }
    };

    var keymap = {
        'D': {
            name: 'Toggle debugging mode',
            run: function() {
                this.$el.toggleClass('debug');
            }
        },
        'next': {
            name: 'Advance to next image',
            run: function() {
                this.showNext(1, true);
            }
        },
        'prev': {
            name: 'Show previous image',
            run: function() {
                this.showNext(-1, true);
            }
        },
        '?': {
            name: 'Show help',
            run: function() {
                var message = ['Keyboard commands:', ''];
                $.each(keymap, function(key, cmd) {
                    message.push(key + ': ' + cmd.name);
                });
                alert(message.join('\n'));
            }
        }
    };

    function PhotoBooth() {
        return {
            // Two separate photo queues are used-- one for cycling through
            // ALL pictures during downtime, and one for displaying new photos
            // ONCE as they come in.
            list: [],
            newPhotoList: [],
            currentIndex: -1,
            timing: 4000,
            newPhotoTiming: 8000,
            flashOnNew: true,
            $el: $(document.body),
            timeout: null,
            fetch: function(next) {
                var self = this;
                $.get('/photos', function(photos) {
                    self.list = photos;
                    if (next) {
                        next.apply(self);
                    }
                });
            },
            start: function() {
                var self = this;
                this.fetch(function() {
                    this.showNext();
                });
            },
            listen: function() {
                var socket = io.connect('http://localhost:3000');
                var seen = {};
                var self = this;

                var showNewPhotoTimeout = 0;

                socket.on('newPhoto', function (data) {

                    // HACK: Some photos were coming down multiple times in
                    // testing, not sure where the issue lies.
                    if (seen[data.path]) {
                        return;
                    }

                    seen[data.path] = true;

                    console.log('newPhoto', data);
                    self.list.push(data.path);
                    self.newPhotoList.push(data.path);

                    // debounce call to showNext in case we are actually receiving
                    // multiple successive newPhoto events-- try to ensure that
                    // in this case, the most recent photo is shown first.
                    if (showNewPhotoTimeout) {
                        clearTimeout(showNewPhotoTimeout);
                    }
                    showNewPhotoTimeout = setTimeout(function() {
                        self.showNext();
                    }, 500);

                });

                self.$el.keypress(function(evt) {
                    var action = keymap[String.fromCharCode(evt.which).toUpperCase()];
                    action && action.run.apply(self);
                }).keydown(function(evt) {
                    var keys = {
                        39: 'next',
                        40: 'next',
                        37: 'prev',
                        38: 'prev'
                    },
                    key = keys[evt.which];
                    if (key) {
                        var action = keymap[key];
                        action && action.run.apply(self);
                    }
                });
            },
            showNext: function(advanceBy, quick) {

                var path = null, isNew = false, index;
                var self = this;

                if (typeof advanceBy == 'undefined') {
                    advanceBy = 1;
                }

                if (self.timeout) {
                    clearTimeout(self.timeout);
                    delete self.timeout;
                }

                // favor photos that have not been shown over those that have
                if (self.newPhotoList.length > 0) {

                    path = self.newPhotoList.pop();
                    isNew = true;

                } else if (self.list.length > 0) {

                    self.currentIndex += advanceBy;
                    if (self.currentIndex >= self.list.length) {
                        self.currentIndex = 0;
                    }

                    index = self.currentIndex;
                    path = self.list[index];
                }

                if (path) {
                    // console.log('selected ' + (isNew ? 'new' : 'old') + ' image: ' + path);
                    self.show(path, isNew, index, quick);
                }

                var timing = self.timing;
                if (isNew && self.newPhotoList.length === 0) {
                    // No upcoming new photos, so keep this one on screen a
                    // little longer.
                    timing = self.newPhotoTiming;
                }

                self.timeout = setTimeout(function() {
                    delete self.timeout;
                    self.showNext();
                }, timing);

            },
            show: function(path, isNew, index, quick) {

                var self = this;
                var fullPath = '/photos/' + encodeURIComponent(path);

                var desc = path;
                var transitionTime = 2000;

                if (quick) {
                    transitionTime = 400;
                }

                if (index !== void 0) {
                    desc += " (" + (index + 1) + "/" + self.list.length + ")";
                } else if (isNew) {
                    desc += " (new, " + self.newPhotoList.length + " remain)";
                }

                var $new = $('<span class="img"></span>')
                    .text(desc)
                    .css({
                        position: 'fixed',
                        left: 0, right: 0,
                        top: 0, bottom: 0,

                        'background-image': 'url(' + fullPath + ')'
                    });

                if (isNew && this.flashOnNew) {
                    transitions.flash(self.$el, $new);
                } else {
                    transitions.crossFade(self.$el, $new, transitionTime);
                }

            }
        };
    }



    var booth = new PhotoBooth();
    booth.start();
    booth.listen();

})(jQuery);

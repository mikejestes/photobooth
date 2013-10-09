(function () {

    var transitions = {
        // Fades in new image while fading out the old one
        crossFade: function($container, $new, duration) {

            var $old = $container.children('.img').not($new);

            $new.css('opacity', 0).appendTo($container);

            $old.animate({ opacity: 0 }, duration, function() {
                $old.remove();
            });

            $new.animate({ opacity: 1 }, duration);
        }
    };

    var keymap = {
        'D': {
            name: 'Toggle debugging mode',
            run: function() {
                this.$el.toggleClass('debug');
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
            list: [],
            currentIndex: 0,
            timing: 4000,
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
                    self.timeout = setTimeout(function() {
                        self.time.apply(self);
                    }, this.timing);
                });
            },
            listen: function() {
                var socket = io.connect('http://localhost:3000');
                var self = this;
                socket.on('newPhoto', function (data) {
                    console.log('newPhoto', data);
                    self.list.push(data.path);
                    self.show(data.path);
                    clearTimeout(self.timeout);
                    self.timeout = setTimeout(function() {
                        self.time.apply(self);
                    }, self.timing);

                });

                self.$el.keypress(function(evt) {
                    var action = keymap[String.fromCharCode(evt.which).toUpperCase()];
                    action && action.run.apply(self);
                }).keydown(function(evt) {
                    var keys = {
                        39: 'RIGHT ARROW',
                        37: 'LEFT ARROW'
                    },
                    key = keys[evt.which];
                    if (key) {
                        var action = keymap[key];
                        action && action.run.apply(self);
                    }
                });
            },
            showNext: function() {
                this.show(this.list[this.currentIndex]);
                this.currentIndex++;
                if (this.currentIndex >= this.list.length) {
                    this.currentIndex = 0;
                }
            },
            show: function(path) {

                var fullPath = '/photos/' + encodeURIComponent(path);

                var $new = $('<span class="img"></span>')
                    .css({
                        position: 'fixed',
                        left: 0, right: 0,
                        top: 0, bottom: 0,

                        'background-image': 'url(' + fullPath + ')'
                    });


                transitions.crossFade(this.$el, $new, 2000);

            },
            time: function() {
                var self = this;
                this.showNext();
                self.timeout = setTimeout(function() {
                    self.time.apply(self);
                }, this.timing);
            }

        };
    }



    var booth = new PhotoBooth();
    booth.start();
    booth.listen();

})(jQuery);

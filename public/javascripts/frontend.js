(function () {

    function PhotoBooth() {
        return {
            list: [],
            currentIndex: 0,
            timing: 4000,
            $el: $('.main'),
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
                this.$el.html('<img src="' + fullPath + '">');
            },
            time: function() {
                var self = this;
                this.showNext();
                self.timeout = setTimeout(function() {
                    self.time.apply(self);
                }, this.timing);
            }

        }
    }



    var booth = new PhotoBooth();
    booth.start();
    booth.listen();

})(jQuery);

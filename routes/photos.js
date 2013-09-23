
/*
 * GET home page.
 */

var fs = require('fs');

exports.list = function(dir, extensions) {
    var regex = new RegExp('\.(' + extensions.join('|') + ')$', 'i');
    list = fs.readdirSync(dir).filter(function(item) {
        if (regex.test(item)) {
            return true;
        }
        return false;
    });

    return {
        list: function() {
            return list;
        }
    }
}

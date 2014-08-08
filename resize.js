var fs = require('fs');
var gm = require('gm')

module.exports = function(from, to, width, height, cb) {
	var tmp = gm(__dirname + from).noProfile().quality(100);
	if (width && height) {
		tmp = tmp.resize(width, height);
	}

	tmp.format(function(err, value) {
		if (err) return cb(err);

		if (!value.toLowerCase().match(/^gif|jpeg|png$/)) return cb("Invalid image format " + value);

		to += "." + value;

		tmp.write(__dirname + to, function(err) {
			cb(err, to);
		});
	})
}

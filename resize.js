var fs = require('fs'),
    gm = require('gm')

module.exports = function(from, to, width, height, cb) {
	var cmd = "convert " + __dirname + from + " -coalesce ";

	if (width && height) {
		cmd += "-resize " + width + "x" + height + " ";
	}

	cmd += "-layers Optimize -quality 100 ";

	gm(__dirname + from).format(function(err, value) {
		if (err) return cb(err);

		if (!value.toLowerCase().match(/^gif|jpeg|png$/)) return cb("Invalid image format " + value);

		to += "." + value.toLowerCase();

		cmd += __dirname + to;

		require('child_process').exec(cmd, function(err, stdout, stderr) {
			if (err !== null) return cb(err);

			cb(null, to);
		})
	})
}

var Canvas = require('canvas')
  , Image = Canvas.Image
  , fs = require('fs')

module.exports = function(from, to, width, height, callback) {
	console.log("from : " + from);
	console.log("to: " + to);
	var returned = false;
	img = new Image;
	img.onload = function() {
		var canvas = new Canvas(width,height);
		ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = true;
		ctx.drawImage(img, 0, 0, width, height);
		var stream = canvas.pngStream();
		var out = fs.createWriteStream(__dirname + to);
		out.on('error', function(err) {
			if (returned) return; else returned = true;
			callback(err);
		})
		stream.on('data', function(chunk) {
			out.write(chunk);
		})
		stream.on('end', function() {
			out.end();
			if (returned) return; else returned = true;
			callback(null, to);
		})
		stream.on('error', function(err) {
			out.end();
			if (returned) return; else returned = true;
			callback(err);
		})
	}
	img.onerror = function(err) {
		callback(err);
	}
	img.src = __dirname + from;
}
/*
exports.resize("/public/uploads/dc380ef19652ade4ce2c9727fdeba7c0", "/test.png", 145, 145, function(err) {
	if (err) return console.log("borkeddded")

	console.log("nice");
})
*/
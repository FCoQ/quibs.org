var express = require('express')
  , http = require('http')
  , path = require('path')
  , crypto = require('crypto')
  , routes = require('./routes')
  , db = require('./db')
  , auth = require('./auth')
  , util = require('./util')
  , resize = require('./resize')
  , async = require('async')

var app = express();

app.configure(function(){
	// all environments
	app.set('port', process.env.PORT || 8080);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');

	app.use(express.cookieParser());
	app.use(express.logger('dev'));
	app.use(express.bodyParser({
		uploadDir: './public/uploads'
	}));
	app.use(express.methodOverride());
	app.use(util.verifyRecaptcha);
	app.use(function(req, res, next) {
		console.log("requested URL " + req.url)
		res.locals._nl2br_escape = util.nl2br_escape;
		res.locals._quote = util.quote;
		res.locals._isset = util.isset;
		res.locals._timeSince = util.timeSince;
		res.locals._attachment = util.attachment;
		res.locals._slug = util.slug;
		res.locals._repeat = util.repeat;

		if (req.url.substring(0, 6) == '/ajax/') {
			req.url = req.url.substring(5);
			res.locals.__REQUEST_TYPE = 'ajax';
			res.locals.__REQUEST_URL = req.url;
		} else {
			res.locals.__REQUEST_TYPE = 'normal';
			res.locals.__REQUEST_URL = req.url;
		}

		if (req.url.substring(0, "/uploads/".length) == "/uploads/") {
			req.url = req.url.replace(".png", "")
			res.contentType("image/png");
		}

		next();
	});
	app.use(express.static(path.join(__dirname, 'public')));
	app.use(app.router);

	app.use(function(err, req, res, next) {
		if (!err) next();

		console.log(err);
		res.statusCode = 500;
		res.send("<script>notifybox(\"We're sorry, there was an error with your request. :(\");</script>");
	});
});

/// ROUTEWARE:
// auth.require - require authentication
// auth.build - build authentication
// util.prepareLayout - prepare layout (navbar, footer) if non-ajax request // todo consider placing this on everything
//////////////////////////////////////////////////////////////////////////////////////

// index
app.get('/', util.prepareLayout, routes.index);

// church fund
app.get('/fund', util.prepareLayout, routes.fund);

// grants page
app.get('/grants/:type?/:page?', util.prepareLayout, auth.build, routes.grants.show);
app.post('/grants', util.prepareLayout, routes.grants.submitgrant);

// blog system
app.post('/blog/:id/submitpost', auth.require, routes.blog.submitpost);
app.post('/blog/:id/setimage', auth.require, routes.blog.setimage);
app.get('/blog/:id/newpost', util.prepareLayout, auth.require, routes.blog.newpost);
app.get('/blog/:id/:page?', util.prepareLayout, auth.build, routes.blog.show);
app.get('/post/:id', util.prepareLayout, auth.build, routes.blogpost.show);
app.post('/post/:id/edit', auth.require, routes.blogpost.editpost);
app.get('/post/:id/delete', auth.require, routes.blogpost.deletepost);
app.get('/blogs', util.prepareLayout, routes.blog.list);

// comments system
app.post('/comment/:id/edit', auth.require, routes.comments.edit);
app.post('/comment/submit', auth.require, routes.comments.submit);
app.get('/comment/:id/delete', auth.require, routes.comments.delete);

// gallery system
app.get(/^\/gallery(\/([0-9]+)?)?$/, util.prepareLayout, routes.gallery.show);

// TODO: make this safer, more agile
app.post('/uploadimage', auth.require, function(req, res) {
	if (!req.files.file)
		return util.error("File was not submitted.", req, res, "File was not submitted.");

	var path = "/" + req.files.file.path;

	async.series({
		orig: function(cb) {
			cb(null, path);
		},
		thumb32: function(cb) {
			resize(path, path + "_32", 32, 32, cb)
		},
		thumb55: function(cb) {
			resize(path, path + "_55", 55, 70, cb)
		},
		thumb64: function(cb) {
			resize(path, path + "_64", 64, 64, cb)
		},
		thumb140: function(cb) {
			resize(path, path + "_140", 140, 140, cb)
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Not a valid image.");

		for (e in results) {
			results[e] = results[e].replace("/public", "")
		}

		results.id = path.replace("/public/uploads/", "");

		res.send(JSON.stringify(results));
	})
});

app.get(/\.(gif|jpg|png|css|js)$/, function(req, res) {
	res.statusCode = 404;
	res.send("404 Not Found");
})

app.get(/^\/uploads\//, function(req, res) {
	res.statusCode = 404;
	res.send("404 Not Found");
})

app.get("*", util.prepareLayout, function(req, res) {
	res.statusCode = 404;
	res.render("404", {title:"404"});
})

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

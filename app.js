var express = require('express')
  , http = require('http')
  , path = require('path')
  , routes = require('./routes')
  , db = require('./db')
  , auth = require('./auth')
  , util = require('./util')
  , async = require('async')
  , fundmanager = require('./fundmanager')
  , fs = require('fs')
  , resize = require('./resize')

var app = express();

var HTTP_PORT = 8080; // main webserver
var WS_PORT = 8081; // websockets for notifications

app.configure(function(){
	// all environments
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');

	app.disable('x-powered-by');
	app.use(express.cookieParser());
	app.use(express.logger('dev'));
	app.use(express.bodyParser({
		uploadDir: './tmp'
	}));
	app.use(function(req, res, next) {
		var discardOriginalFile = function() {
			if (!req.files) return;

			for (name in req.files) {
				fs.unlinkSync(req.files[name].path);
			}
		}

		if (req.url.match(/^\/uploadimage/)) {
			if (!req.files.file) {
				discardOriginalFile();
				res.statusCode = 500;
				res.send("500 Internal Server Error: No file submitted.");
				return;
			}

			var path = "/" + req.files.file.path;
			var newname = util.token();

			async.series({
				orig: function(cb) {
					resize(path, "/public/uploads/" + newname + "_orig", false, false, cb)
				},
				thumb32: function(cb) {
					resize(path, "/public/uploads/" + newname + "_32", 32, 32, cb)
				},
				thumb55: function(cb) {
					resize(path, "/public/uploads/" + newname + "_55", 55, 55, cb)
				},
				thumb64: function(cb) {
					resize(path, "/public/uploads/" + newname + "_64", 64, 64, cb)
				},
				thumb140: function(cb) {
					resize(path, "/public/uploads/" + newname + "_140", 140, 140, cb)
				}
			}, function(err, results) {
				if (err) {
					console.log(err);
					discardOriginalFile();
					res.statusCode = 500;
					res.send("500 Internal Server Error: Invalid file format.");
					return;
				}

				for (name in results) {
					results[name] = results[name].replace("/public", "")
				}

				db.query("INSERT INTO imageuploads (orig, thumb32, thumb55, thumb64, thumb140, ip) values (?, ?, ?, ?, ?, ?)",
					[results.orig, results.thumb32, results.thumb55, results.thumb64, results.thumb140, util.ip(req)],
					function(err, r) {
						if (err) {
							discardOriginalFile();
							res.statusCode = 500;
							res.send("500 Internal Server Error: Couldn't save attachment.");
							return;
						}

						results.id = r.insertId;

						discardOriginalFile();
						res.send(JSON.stringify(results));
					}
				);
			})
		} else {
			discardOriginalFile();
			next();
		}
	})
	app.use(express.methodOverride());
	app.use(function(req, res, next) {
		var method = req.method;

		if (method == "POST") {
			if ((!util.isValidToken(req.body.csrf)) || (req.body.csrf != req.cookies.csrf)) {
				res.statusCode = 403;
				res.send("403 Forbidden: CSRF validation failure.");
			} else {
				next();
			}
		} else {
			next();
		}
	})
	app.use(function(req, res, next) {
		if (!util.isValidToken(req.cookies.csrf)) {
			res.cookie('csrf', util.token(), {maxAge: 94636000000, httpOnly:false})
		}
		next();
	})
	app.use(util.verifyRecaptcha);
	app.use(function(req, res, next) {
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

		next();
	});
	
	app.use(express.static(path.join(__dirname, 'public'), {
		maxAge: 86400000
	}));
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

// testimonials / quotes
app.get('/quotes', util.prepareLayout, routes.quotes);

// grants page
app.get('/grants/:type?/:page?', util.prepareLayout, auth.build, routes.grants.show);
app.post('/grants', util.prepareLayout, routes.grants.submitgrant);

// club system
app.get('/clubs', util.prepareLayout, routes.clubs.list);
app.get('/club/:id', auth.build, util.prepareLayout, routes.clubs.view)
app.post('/club/:id/join', util.prepareLayout, auth.require, routes.clubs.join)
app.post('/club/:id/edit', util.prepareLayout, auth.require, routes.clubs.edit)
app.get('/club/:id/discussion', util.prepareLayout, auth.require, routes.clubs.discussion)
app.post('/club/:id/ban', util.prepareLayout, auth.require, routes.clubs.ban)

// blog system
app.post('/blog/:id/submitpost', auth.require, routes.blog.submitpost);
app.post('/blog/:id/setimage', auth.require, routes.blog.setimage);
app.get('/blog/:id/newpost', util.prepareLayout, auth.require, routes.blog.newpost);
app.get('/blog/:id/:page?', util.prepareLayout, auth.build, routes.blog.show);
app.get('/post/:id', util.prepareLayout, auth.build, routes.blogpost.show);
app.post('/post/:id/edit', auth.require, routes.blogpost.editpost);
app.post('/post/:id/delete', auth.require, routes.blogpost.deletepost);
app.get('/blogs', util.prepareLayout, routes.blog.list);

// comments system
app.post('/comment/:id/edit', auth.require, routes.comments.edit);
app.post('/comment/submit', auth.require, routes.comments.submit);
app.post('/comment/:id/delete', auth.require, routes.comments.delete);

// gallery system
app.get(/^\/gallery(\/([0-9]+)?)?$/, auth.build, util.prepareLayout, routes.gallery.show);
app.get('/viewimage/:id', auth.build, util.prepareLayout, routes.gallery.viewimage);
app.post('/gallery/upload', auth.require, util.prepareLayout, routes.gallery.upload);

// inbox system
app.get('/inbox/:type', util.prepareLayout, auth.require, routes.notifications.inbox);

// user centric stuff
app.get('/register', util.prepareLayout, routes.user.register);
app.post('/register', util.prepareLayout, auth.build, routes.user.register_submit);
app.get('/logout', util.prepareLayout, routes.user.logout);
app.get('/login', util.prepareLayout, routes.user.login);
app.post('/login', util.prepareLayout, routes.user.login_submit)
app.get('/verify/:code', util.prepareLayout, routes.user.verify)
app.get('/verify', auth.require, util.prepareLayout, routes.user.verify_form)
app.post('/verify', auth.require, util.prepareLayout, routes.user.submit_verify_form)
app.get('/forgotpassword', util.prepareLayout, routes.user.forgot);
app.post('/forgotpassword', util.prepareLayout, routes.user.forgot_submit);
app.get('/reset/:code', util.prepareLayout, routes.user.reset);
app.post('/reset/:code', util.prepareLayout, routes.user.reset_submit);

app.get('/panel', util.prepareLayout, auth.require, routes.user.panel);
app.post('/panel/setavatar', auth.require, routes.user.setavatar);
app.post('/panel/changeemail', auth.require, routes.user.changeemail);
app.post('/panel/changepass', auth.require, routes.user.changepass);

app.get("*", util.prepareLayout, function(req, res) {
	res.statusCode = 404;
	res.render("404", {title:"404"});
})

// TODO: refactor so that much of this logic is in separate components
http.createServer(app).listen(HTTP_PORT, "localhost", function(){
  console.log('Express server listening on port ' + HTTP_PORT + '...');

  var io = require('socket.io').listen(http.createServer().listen(WS_PORT, 'localhost'))

  var users = [];

  io.sockets.on('connection', function(socket) {
  	var ip = socket.request.headers['x-real-ip'];
  	var active = true;

  	console.log("WebSocket connection from IP " + ip)

  	var $COOKIE = (socket.handshake.headers.cookie || '').split(/;\s*/).reduce(function(re, c) {
	  var tmp = c.match(/([^=]+)=(.*)/);
	  if (tmp) re[tmp[1]] = unescape(tmp[2]);
	  return re;
	}, {});

	auth.verify(String($COOKIE.email), String($COOKIE.pass), function(err, userdata) {
		if (err) return; // TODO: ?

		if (!userdata) return; // TODO: ?

		function f(repeat) {
			if (!active) return;

			routes.notifications.getNum(userdata.id, function(err, result) {
				if (err) return; // TODO: ?

				socket.emit('newNotifications', result)
			})

			if (repeat)
				setTimeout(function() {f(repeat);}, 10000);
		};
		f(true);

		socket.on('fetch', function() {
			f(false);
		})
	})

  	socket.on('disconnect', function() {
  		active = false;
  	})
  })
  
  // bitcoin fund manager
  fundmanager(io);
});

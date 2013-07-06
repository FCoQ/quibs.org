var async = require('async')
  , util = require('./util')
  , db = require('./db')

var self = exports;

// rebuild authentication (perhaps the page updated the user account info)
exports.rebuild = function(req, res, next) {
	delete res.locals.__AUTH_LOGGED_IN;
	self.build(req, res, next);
}

// build authentication, this is middleware for building auth from cookie data
exports.build = function (req, res, next) {
	if (util.isset(res.locals.__AUTH_LOGGED_IN))
		return next();

	res.locals.__AUTH_USERDATA = {};
	res.locals.__AUTH_LOGGED_IN = false;

	if (!util.isset(req.cookies.email) || !util.isset(req.cookies.pass))
		next();

	async.series({
		userdata: function(callback) {
			db.query("SELECT * FROM users WHERE email=?", [req.cookies.email], callback);
		}
	}, function(err, results) {
		if (util.isset(results.userdata.length) && (results.userdata.length > 0)) {
			results.userdata = results.userdata[0];
			if (results.userdata.pass == req.cookies.pass) {
				res.locals.__AUTH_LOGGED_IN = true;
				res.locals.__AUTH_USERDATA = results.userdata;
			}
		}
		next();
	});
}

// require authentication for the page, forces a build() if it hasn't already
exports.require = function(req, res, next) {
	self.build(req, res, function() {
		if (res.locals.__AUTH_LOGGED_IN == false) {
			util.redirect(req, res, '/login');
		} else {
			next();
		}
	});
}
var step = require('step')
  , util = require('./util')
  , db = require('./db')

var self = exports;

exports.build = function (req, res, next) {
	res.locals.__AUTH_USERDATA = {};
	res.locals.__AUTH_LOGGED_IN = false;

	step(
		function () {
			db.query("SELECT * FROM users WHERE email=?", [req.cookies.email], this);
		},
		function (userdata) {
			console.log(userdata);
			if (userdata.length > 0) {
				userdata = userdata[0];
				if (userdata.pass == req.cookies.pass) {
					res.locals.__AUTH_LOGGED_IN = true;
					res.locals.__AUTH_USERDATA = userdata;
				}
			}
			next();
		}
	);
}

exports.require = function(req, res, next) {
	self.build(req, res, function() {
		if (res.locals.__AUTH_LOGGED_IN == false) {
			util.redirect(req, res, '/login');
		} else {
			next();
		}
	});
}
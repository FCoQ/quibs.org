var auth = require('./auth'),
	step = require('step'),
	db = require('./db'),
	Recaptcha = require('recaptcha').Recaptcha

var RECAPTCHA_PUBLIC_KEY = "6LeJ8eESAAAAAMfJjOGW94Uw7HO-sA19JMtriC9p";
var RECAPTCHA_PRIVATE_KEY = process.env.PRIVATEKEY;

var self = exports;

exports.verifyRecaptcha = function(req, res, next) {
	res.locals.__RECAPTCHA = false;
	res.locals.__RECAPTCHA_PUBLIC_KEY = RECAPTCHA_PUBLIC_KEY;

	if (typeof(req.body.recaptcha_challenge_field) == 'undefined') {
		next();
		return;
	}

	if (typeof(req.body.recaptcha_response_field) == 'undefined') {
		next();
		return;
	}

	var data = {
		remoteip: req.connection.remoteAddress,
		challenge: req.body.recaptcha_challenge_field,
		response: req.body.recaptcha_response_field
	};

	var _recaptcha = new Recaptcha(RECAPTCHA_PUBLIC_KEY, RECAPTCHA_PRIVATE_KEY, data);

	_recaptcha.verify(function(success, error_code) {
		if (success) {
			res.locals.__RECAPTCHA = true;
			next();
			return;
		} else {
			res.locals.__RECAPTCHA = false;
			next();
			return;
		}
	});
}

exports.redirect = function(req, res, path) {
	if (res.locals.__REQUEST_TYPE == 'ajax')
		res.render('redirect', {'path':'/login'});
	else
		res.redirect(path);
}

exports.escape = function (html){
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

exports.nl2br_escape = function(str) {
	return self.escape(str).replace(/\n/g, "<br />");
}

exports.prepareLayout = function(req, res, next) {
	if (res.locals.__REQUEST_TYPE == 'normal') {
		step(
			function() {
				auth.build(req, res, this); // build authentication
			},
			function () {
				db.query("SELECT id,name FROM blogs", [], this);
			},
			function(rows) {
				res.locals.main_blogs = rows;
				db.query("SELECT username FROM users ORDER BY id DESC LIMIT 3", [], this);
			},
			function (users) {
				res.locals.main_lastusers = users;
				next();
			}
		);
	} else {
		next();
	}
};

exports.randomElement = function(array) {
	return array[Math.floor(Math.random()*array.length)]
}
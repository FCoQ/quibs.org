var auth = require('./auth'),
	async = require('async'),
	db = require('./db'),
	Recaptcha = require('recaptcha').Recaptcha

var RECAPTCHA_PUBLIC_KEY = "6LeJ8eESAAAAAMfJjOGW94Uw7HO-sA19JMtriC9p";
var RECAPTCHA_PRIVATE_KEY = process.env.PRIVATEKEY;

var self = exports;

// TODO: do better than this
exports.error = function(err, req, res) {
	console.log("--------------------\n" + err + "\n--------------------");
	res.send("We're sorry... there was an error with your request. :(");
}

/**
pagination:
query = "SELECT * FROM grants WHERE derp=?" (example)
countquery = "SELECT count(id) as cnt WHERE derp!=?"
params = [] params for query
curpage = 1
perpage = 10
callback = function(pagedata, lastpage)
**/
exports.pagination = function(query, countquery, params, curpage, perpage, after) {
	async.series({
		page: function(callback) {
			db.query(query + " LIMIT ?,?", params.concat([(curpage-1)*perpage, perpage]), callback);
		},
		count: function(callback) {
			db.query(countquery, params, callback);
		}
	}, function(err, results) {
		if (err) return after(err, {});

		after(null, {rows: results.page, pages: Math.ceil(results.count[0].cnt / perpage)});
	});
}

exports.timeNow = function() {
	return Math.floor(new Date().getTime()/1000);
}

exports.timeSince = function(timestamp) {
    var seconds = Math.floor(((new Date().getTime()/1000) - timestamp));

    var interval = Math.floor(seconds / 31536000);

    if (interval >= 1) {
        return interval + " years ago";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval + " months ago";
    }
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval + " days ago";
    }
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval + " hours ago";
    }
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval + " minutes ago";
    }
    return Math.floor(seconds) + " seconds ago";
}

exports.isset = function(param) {
	if (typeof(param) == 'undefined')
		return false;

	return true;
}

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
		async.series({
			auth: function (callback) {
				auth.build(req, res, function() {
					callback(null, []);
				});
			},
			blogs: function(callback) {
				db.query("SELECT id,name FROM blogs", [], callback);
			},
			lastusers: function(callback) {
				db.query("SELECT username FROM users ORDER BY id DESC LIMIT 3", [], callback);
			}
		}, function(err, results) {
			res.locals.main_blogs = results.blogs;
			res.locals.main_lastusers = results.lastusers;
			next();
		});
	} else {
		next();
	}
};

exports.randomElement = function(array) {
	return array[Math.floor(Math.random()*array.length)]
}
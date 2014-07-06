var auth = require('./auth'),
	async = require('async'),
	db = require('./db'),
	Recaptcha = require('recaptcha').Recaptcha

var RECAPTCHA_PUBLIC_KEY = "6LfX7vISAAAAAGFqn4yRgOGpx6zfIG05XxBgN0Tz";
var RECAPTCHA_PRIVATE_KEY = process.env.PRIVATEKEY;

var self = exports;

// TODO: do better than this
exports.error = function(err, req, res, readable) {
	console.log("--------------------\n" + err + "\n--------------------");
	res.render('error', {readable: readable});
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

exports.attachment = function(url) {
	if (url == null)
		return ""

	if (url.match(/^[a-fA-F0-9]{32}$/)) {
		return "/uploads/" + url;
	} else {
		return url
	}
}

exports.slug = function(base, w) {
	return base + "-" + w.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
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
	res.render('redirect', {'path':path});
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
			lastusers: function(callback) {
				db.query("SELECT username FROM users ORDER BY id DESC LIMIT 3", [], callback);
			}
		}, function(err, results) {
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
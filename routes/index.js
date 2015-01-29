var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	crypto = require('crypto')
/*
 * GET home page.
 */

var self = exports;

exports.index = function(req, res) {
	async.series({
		quotes: function(callback) {
			db.query("SELECT c.`text` as `text`,u.username as username FROM quotes c LEFT JOIN users u ON u.id=c.uid", [], callback);
		},
		clubs: function(callback) {
			db.query("SELECT * FROM clubs ORDER BY `order` DESC", [], callback);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't render index page, try again later.");

		res.render('index', {title:'A metric that\'s changing', clubs:results.clubs, randomquote:util.randomElement(results.quotes)});
	});
};

exports.map = function(req, res) {
	db.query("SELECT country,count(ip) as num FROM teamspeak_ips GROUP BY country ORDER BY num DESC", [], function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't get teamspeak statistics.");
	
		var r = {};

		results.forEach(function(val) {
			r[val['country']] = val['num'];
		})

		res.render('tsmap', {'title':'Teamspeak Map', results: r});
	})
}

exports.fund = function(req, res) {
	db.query("SELECT * FROM fund", [], function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't get church fund balance sheet.");

		db.query("SELECT * FROM fund_btcusd", [], function(err, btcusd_results) {
			if (err) return util.error(err, req, res, "Couldn't get historic BTCUSD rate.");

			var btcusd = {};
			btcusd_results.forEach(function(day) {
				btcusd[Math.floor(day.date / 86400) * 86400] = day.btcusd;
			})

			res.render('fund', {title:'Fund', fund:results, btcusd:btcusd});
		})
	})
};

exports.qps = function(req, res) {
	var username = String(req.body.username)
        var password = String(req.body.password)

        var sha1 = crypto.createHash('sha1');
        sha1.update(password);
        var hashed_password = sha1.digest('hex');

        db.query("SELECT * FROM users WHERE username=? AND pass=?", [username, hashed_password], function(err, results) {
                if (err || (results.length != 1)) {
			res.status(403);
			res.send("");
			return;
                }

                var userdata = results[0];
		res.status(200);
		
		var sha1 = crypto.createHash('sha1');
		sha1.update(process.env.DBPASS + ":" + userdata['username']);
		var hmac = sha1.digest('hex');
		res.send(userdata['username'] + ":" + hmac);
        });
}

exports.mail = function(req, res) {
	if (res.locals.__AUTH_LOGGED_IN) {
		if (res.locals.__AUTH_USERDATA['webmail']) {
			var sha1 = crypto.createHash('sha1');
			var t = util.timeNow();
			sha1.update(process.env.DBPASS + ":" + res.locals.__AUTH_USERDATA['webmail'] + ":" + t);
			var hmac = sha1.digest('hex');

			util.redirect(req, res, "https://mail.quibs.org/?u=" + res.locals.__AUTH_USERDATA['webmail'] + "&hmac=" + hmac + "&t=" + t, true);
		} else {
			res.locals.msg = "Ask quibs for an email account.";
			util.redirect(req, res, "/");
		}
	} else {
		res.locals.msg = "You must be logged in to use the webmail.";
		util.redirect(req, res, "/login");
	}
}

exports.quotes = require('./quotes')
exports.grants = require('./grants')
exports.blog = require('./blog') // todo: might as well merge this with blogpost anyway
exports.blogpost = require('./blogpost')
exports.comments = require('./comments')
exports.gallery = require('./gallery')
exports.user = require('./user')
exports.notifications = require('./notifications')
exports.clubs = require('./clubs')
exports.admin = require('./admin')

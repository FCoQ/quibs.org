var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth'),
	comments = require('./comments')

var self = exports;

exports.inbox = function(req, res) {
	var type = String(req.params.type);

	// valid types
	switch (type) {
		case "grant":
		case "comment_reply":
		break;
		default:
			return util.error(null, req, res, "Invalid inbox type.")
		break;
	}

	db.query("SELECT * FROM new_notifications WHERE uid=? AND type=? AND `read`=0 ORDER BY `time` DESC", [res.locals.__AUTH_USERDATA.id, type], function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't load notifications.")

		//db.query("UPDATE notifications SET read=1 WHERE uid=? AND type=?", [res.locals.__AUTH_USERDATA.id, type], function(err, results) {
			self.proc(results, req, res, function(err, notifications) {
				res.render("inbox", {type: type, title:'Inbox', notifications:notifications})
			})
		//})
	})
}

exports.proc = function(notifications, req, res, next) {
	async.mapSeries(notifications, function(item, callback) {
		if (item.type == "grant") {
			db.query("SELECT * FROM grants WHERE id=?", [item.obj], function(err, result) {
				if (err) return callback(err, null);

				if (result.length == 1) {
					item.grant = result[0];
					callback(null, item);
				}
			})
		} else if (item.type == "comment_reply") {
			comments.fetchTree(req, res, null, function(err, tree) {
				if (err) return callback(err, null);

				item.tree = tree;
				item.cancomment = true;
				callback(null, item);
			}, item.obj);
		}
	}, function(err, results) {
		if (err) return next(err);

		next(null, results);
	})
}
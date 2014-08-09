var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth'),
	comments = require('./comments')

var self = exports;

// ajax only
exports.upload = function(req, res) {
	var err = function() {
		res.statusCode = 400;
		res.send("");
	}

	auth.permission(req, res, ["upload gallery image"], function(error, canupload) {
		if (error) return err();
		if (!canupload) return err();
		if (!util.isset(req.body.attachment)) return err();

		var attachment = parseInt(req.body.attachment);

		db.query("INSERT INTO images (url, time, uid, tags) VALUES (?, ?, ?, ?)", [attachment, util.timeNow(), res.locals.__AUTH_USERDATA.id, "[]"], function(err) {
			if (err) return err();

			res.send("");
		})
	})
}

exports.show = function(req, res) {
	var page = parseInt(req.params[1]);
	if (!page)
		page = 1;

	var start = (page - 1) * 9;

	db.query("SELECT g.*, u.username as username,i.orig as url,g.url as oldurl FROM images g LEFT JOIN users u ON u.id=g.uid LEFT JOIN imageuploads i ON i.id=g.url ORDER BY g.time DESC LIMIT ?,9", [start], function(err, results) {
		results = results.map(function(v) {
			if (!v.username) {
				v.username = "Dobby";
			}

			return v;
		})

		async.map(results, function(v, ret) {
			if (!v.username) {
				v.username = "Dobby";
			}

			comments.getnum('image_' + v.id, req, res, function(err, res) {
				if (err) return ret(err);

				v.url = decodeURIComponent(v.url);
				v.numcomments = res;
				ret(null, v);
			});
		}, function(err, results) {
			if (err) return util.error(err, req, res, "Couldn't process gallery images.");

			auth.permission(req, res, ["upload gallery image"], function(err, canupload) {
				if (err) return util.error(err, req, res, "Couldn't process permissions.");

				res.render("gallery", {page: page, title:'Gallery', images:results, canupload:canupload});
			})
		})
	})
}

exports.viewimage = function(req, res) {
	var id = parseInt(req.params.id);
	if (!id) return util.error(null, req, res, "Invalid image ID.");

	db.query("SELECT g.*,i.orig as url,g.url as oldurl FROM images g LEFT JOIN imageuploads i ON i.id=g.url WHERE g.id=?", [id], function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't get image ID.");
		if (results.length != 1) return util.error(null, req, res, "That image doesn't exist or was deleted.");

		async.series({
			tree: function(cb) {
				comments.fetchTree(req, res, "image_" + id, cb);
			},
			cancomment: function(callback) {
				auth.permission(req, res, ["submit comment", "image_" + id], callback)
			}
		}, function(err, c_results) {
			if (err) return util.error(err, req, res, "Couldn't get comment tree.");

			res.render("viewimage", {title: 'Image #' + id, image: results[0], comments: c_results.tree, cancomment: c_results.cancomment});
		})
	})
}
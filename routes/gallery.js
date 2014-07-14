var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth'),
	comments = require('./comments')

var self = exports;

exports.show = function(req, res) {
	var page = parseInt(req.params[1]);
	if (!page)
		page = 1;

	var start = (page - 1) * 9;

	db.query("SELECT g.*, u.username as username FROM images g LEFT JOIN users u ON u.id=g.uid ORDER BY g.time DESC LIMIT ?,9", [start], function(err, results) {
		results = results.map(function(v) {
			if (!v.username) {
				v.username = "Dobby";
			}

			return v;
		})
		res.render("gallery", {page: page, title:'Gallery', images:results});
	})
}

exports.viewimage = function(req, res) {
	var id = parseInt(req.params.id);
	if (!id) return util.error(null, req, res, "Invalid image ID.");

	db.query("SELECT * FROM images WHERE id=?", [id], function(err, results) {
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
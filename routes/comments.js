var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth')

var self = exports;

function descend(mapComments, parent) {
	var tree = [];

	if (mapComments[parent] != undefined) {
		mapComments[parent].forEach(function(comment) {
			tree.push({comment: comment, children: descend(mapComments, comment.id)})
		})
	}

	return tree;
}

// ajax only
exports.edit = function(req, res) {
	var end = function() {
		res.statusCode = 400;
		res.send("");
	}

	var id = parseInt(req.params.id);
	if (!id) return end();

	var content = req.body.content;
	if (!content) return end();
	content = String(content);

	db.query("SELECT * FROM comments WHERE id=?", [id], function(err, comment) {
		if (err || !comment.length) return end();

		comment = comment[0];

		auth.permission(req, res, ["edit comment", comment], function(err, canedit) {
			if (!canedit) return end();

			db.query("UPDATE comments SET content=? WHERE id=?", [content, id], function(err) {
				if (err) return end();

				self.fetchTree(req, res, comment.master, function(err, tree) {
					if (err) return end();

					res.send(tree[0].comment.content);
				}, id, comment.parent)
			})
		});
	})
}

exports.fetchTree = function(req, res, master, callback, just, justparent) {
	async.series({
		canview: function(cb) {
			auth.permission(req, res, ["view comments", master], cb);
		},
		comments: function(cb) {
			if (just)
				db.query("SELECT c.*,u.username as username,u.avatar as avatar FROM comments c LEFT JOIN users u ON u.id=c.uid WHERE c.id=? ORDER BY c.date ASC", [just], cb);
			else
				db.query("SELECT c.*,u.username as username,u.avatar as avatar FROM comments c LEFT JOIN users u ON u.id=c.uid WHERE c.master=? ORDER BY c.date ASC", [master], cb);
		}
	}, function(err, results) {
		if (err) return callback(err, []);

		if (!results.canview)
			return callback(null, []);

		if (results.comments.length == 0)
			return callback(null, []);

		var mapComments = {};

		async.each(results.comments, function(comment, cb) {
			if (mapComments[comment.parent] == undefined)
				mapComments[comment.parent] = [];

			// get permission to edit comment
			auth.permission(req, res, ["edit comment", comment], function(err, canedit) {
				if (err) return cb(err);

				comment.canedit = canedit;

				// parse bbcode of comment
				bbcode.parse(comment.content, function(err, data) {
					if (err) return cb(err);

					comment.rawcontent = comment.content;
					comment.content = data;
					mapComments[comment.parent].push(comment);
					cb();
				})
			})
		}, function(err) {
			if (err) return callback(err);

			if (just)
				callback(null, descend(mapComments, justparent));
			else
				callback(null, descend(mapComments, 0));
		})
/*
		// turn into parent => children map
		results.comments.forEach(function(comment) {
			if (mapComments[comment.parent] == undefined)
				mapComments[comment.parent] = [];

			auth.permission(req, res, ["edit comment", comment], function(err, ) {

			})

			mapComments[comment.parent].push(comment);
		})

		// turn into tree starting at parent 0
		callback(null, descend(mapComments, 0));
*/
	})
}
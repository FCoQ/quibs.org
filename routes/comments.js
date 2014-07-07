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

exports.fetchTree = function(req, res, master, callback) {
	async.series({
		canview: function(cb) {
			auth.permission(req, res, ["view comments", master], cb);
		},
		comments: function(cb) {
			db.query("SELECT * FROM comments WHERE master=? ORDER BY date ASC", [master], cb);
		}
	}, function(err, results) {
		if (err) return callback(err, []);

		if (!results.canview)
			return callback(null, []);

		if (results.comments.length == 0)
			return callback(null, []);

		var mapComments = {};

		// turn into parent => children map
		results.comments.forEach(function(comment) {
			if (mapComments[comment.parent] == undefined)
				mapComments[comment.parent] = [];

			mapComments[comment.parent].push(comment);
		})

		// turn into tree starting at parent 0
		callback(null, descend(mapComments, 0));
	})
}
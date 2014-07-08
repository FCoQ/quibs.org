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

exports.submit = function(req, res) {
	var end = function() {
		res.statusCode = 400;
		res.send("");
	}

	var master = req.body.master;
	if (!master) return end();
	master = String(master);

	if (req.body.parent === undefined) return end();
	var parent = parseInt(req.body.parent);

	var content = req.body.content;
	if (!content) return end();
	content = String(content);

	var depth = parseInt(req.body.depth);
	if (!depth) return end();

	async.series({
		parent: function(callback) {
			if (parent == 0) {
				callback(null, true)
			} else {
				db.query("SELECT * FROM comments WHERE id=?", [parent], callback)
			}
		},
		canpost: function(callback) {
			auth.permission(req, res, ["submit comment", master], callback)
		}
	}, function(err, results) {
		if (err) return end();

		if (results.parent !== true && !results.parent.length) return end();

		if (!results.canpost) return end();

		db.query("INSERT INTO comments (id, master, parent, uid, date, content) values (null, ?, ?, ?, ?, ?)",
			[master, parent, res.locals.__AUTH_USERDATA.id, util.timeNow(), content],
			function(err, result) {
				if (err) return end();

				var newid = result.insertId;

				self.fetchTree(req, res, master, function(err, tree) {
					if (err) return end();

					res.render("newcomment", {depth: depth, tree: tree[0], master: master, parent: parent})
				}, newid, parent)
		})
	})
}

exports.delete = function(req, res) {
	var end = function() {
		res.statusCode = 400;
		res.send("");
	}

	var id = parseInt(req.params.id);
	if (!id) return end();

	db.query("SELECT * FROM comments WHERE id=?", [id], function(err, comment) {
		if (err || !comment.length) return end();

		comment = comment[0];

		auth.permission(req, res, ["edit comment", comment], function(err, canedit) {
			if (!canedit) return end();

			db.query("DELETE FROM comments WHERE id=?", [id], function(err) {
				if (err) return end();

				res.send("");
			})
		});
	})
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
	})
}
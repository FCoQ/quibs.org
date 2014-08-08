var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth'),
	comments = require('./comments')

var self = exports;

function getBlogPost(id, callback) {
	if (!util.isset(id))
		return callback("No blogpost ID sent.");

	id = parseInt(id);
	if (!id)
		return callback("Valid blogpost ID not sent.");

	async.series({
		post: function(c) {
			db.query("SELECT bp.*,b.name as blogname FROM blogposts bp LEFT JOIN blogs b ON b.id=bp.bid WHERE bp.id=?", [id], c)
		}
	}, function(err, results) {
		if (err) return callback(err);

		if (results.post.length > 0) {
			var post = results.post[0];

			return callback(null, post);
		} else {
			return callback("Couldn't get post information!");
		}
	})
};

exports.deletepost = function(req, res) {
	getBlogPost(req.params.id, function(err, post) {
		if (err) return util.error(err, req, res, "That blog post may not exist or we couldn't find it.");

		auth.permission(req, res, ["edit blog", post.bid], function(err, ok) {
			if (err) return util.error(err, req, res, "Couldn't get permission information.");

			if (!ok) {
				util.error(null, req, res, "You do not have permission to edit this blog.");
			} else {
				db.query("DELETE FROM blogposts WHERE id=?", [post.id], function(err, result) {
					if (err) return util.error(err, req, res, "Couldn't delete post for some reason.");

					res.locals.msg = "Post deleted!";
					util.redirect(req, res, '/blog/' + post.bid) // TODO: slug here?
				})
			}
		})
	})
}

exports.editpost = function(req, res) {
	if (!util.isset(req.body.title))
		return util.error(null, req, res, "Title wasn't sent.");

	if (!util.isset(req.body.content))
		return util.error(null, req, res, "Content wasn't sent.");

	getBlogPost(req.params.id, function(err, post) {
		if (err) return util.error(err, req, res, "That blog post may not exist or we couldn't find it.");

		auth.permission(req, res, ["edit blog", post.bid], function(err, ok) {
			if (err) return util.error(err, req, res, "Couldn't get permission information.");

			if (!ok) {
				util.error(null, req, res, "You do not have permission to edit this blog.");
			} else {
				db.query("UPDATE blogposts SET title=?, msg=? WHERE id=?", [req.body.title, req.body.content, post.id], function(err, result) {
					if (err) return util.error(err, req, res, "Couldn't edit post for some reason.")

					res.locals.msg = "Post updated!";
					util.redirect(req, res, '/post/' + util.slug(post.id, post.title))
				})
			}
		})
	})
}

exports.show = function(req, res) {
	var id = req.params.id;

	getBlogPost(id, function(err, post) {
		id = parseInt(id);
		if (err) return util.error(err, req, res, "That blog post may not exist or we couldn't find it.");

		async.series({
			blogdata: function(callback) {
				db.query("SELECT b.*,i.thumb140 as 140x140 FROM blogs b LEFT JOIN imageuploads i ON i.id=b.140x140 WHERE b.id=?", [post.bid], callback);
			},
			canedit: function(callback) {
				auth.permission(req, res, ["edit blog", post.bid], callback);
			},
			cancomment: function(callback) {
				auth.permission(req, res, ["submit comment", "blogpost_" + id], callback)
			},
			comments: function(callback) {
				comments.fetchTree(req, res, "blogpost_" + id, callback);
			}
		}, function(err, results) {
			if (err) return util.error(err, req, res, "Couldn't get blog information.");

			bbcode.parse(post.msg, function(err, data) {
				if (err) return util.error(err, req, res, "BBcode parser failed!");

				post.rawmsg = post.msg;
				post.msg = data;

				comments.getnum('blogpost_' + id, req, res, function(err, numcomments) {
					if (err) return util.error(err, req, res, "Couldn't get the number of comments.");

					post.numcomments = numcomments;

					res.render('blogpost', {title:post.title, posts: [post], blogdata: results.blogdata[0], canedit: results.canedit, cancomment: results.cancomment, comment_tree: results.comments});
				})
			})
		})
	})
}
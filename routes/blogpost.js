var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth')

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
		if (err) return util.error(err, req, res);

		auth.permission(req, res, ["edit blog", post.bid], function(err, ok) {
			if (err) return util.error(err, req, res);

			if (!ok) {
				res.locals.msg = "You do not have permission to update this post.";
			} else {
				// TODO: perform the delete
				res.locals.msg = "Post deleted!";
			}

			// TODO: redirect to blog post
			//util.redirect(req, res, '/blogpost/' + post.id)
			util.redirect(req, res, '/blog/' + post.bid)
		})
	})
}

exports.editpost = function(req, res) {
	getBlogPost(req.params.id, function(err, post) {
		if (err) return util.error(err, req, res);

		auth.permission(req, res, ["edit blog", post.bid], function(err, ok) {
			if (err) return util.error(err, req, res);

			if (!ok) {
				res.locals.msg = "You do not have permission to update this post.";
			} else {
				// TODO: perform the update
				res.locals.msg = "Post updated!";
			}

			// TODO: redirect to blog post
			//util.redirect(req, res, '/blogpost/' + post.id)
			util.redirect(req, res, '/blog/' + post.bid)
		})
	})
}

exports.show = function(req, res) {
	getBlogPost(req.params.id, function(err, post) {
		if (err) return util.error(err, req, res);

		res.render('blogpost', {title:'</title>', post: post});
	})
}
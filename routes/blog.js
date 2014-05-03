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
	var page;
	if (!util.isset(req.params.page))
		page = 1;
	else
		page = parseInt(req.params.page);

	if (!util.isset(req.params.id))
		return util.error("There's no blog by that ID.", req, res);

	var id = parseInt(req.params.id);
	if (!id)
		return util.error("There's no blog by that ID.", req, res);
	
	var perpage = 5;

	async.series({
		blogdata: function(callback) {
			db.query("SELECT * FROM blogs WHERE id=?", [id], callback);
		},
		posts: function(callback) {
			util.pagination("SELECT bp.*,u.username as username FROM blogposts bp LEFT JOIN users u ON u.id=bp.uid WHERE bp.bid=? ORDER BY bp.date DESC",
				"SELECT count(bp.id) as cnt FROM blogposts bp WHERE bp.bid=?",
				[id],
				page,
				perpage,
				callback);
		},
		canedit: function(callback) {
			auth.permission(req, res, ["edit blog", id], callback);
		}
	}, function(err, results) {
		if (err) return util.error("Couldn't get blog information!", req, res);

		async.map(results.posts.rows, function(post, callback) {
			bbcode.parse(post.msg, function(err, data) {
				if (err) return callback(err);

				post.rawmsg = post.msg;
				post.msg = data;
				callback(null, post);
			});
		}, function(err, posts) {
			if (err) return util.error("BBcode parser failed!", req, res);

			res.render('blog', {title:'Blog', blogdata: results.blogdata[0], posts: posts, lastpage: results.posts.pages, curpage: page, canedit: results.canedit});
		})
	})
	// TODO! comments, date stuff, bbcode, etc.
/*
	step(
		function() {
			db.query("SELECT * FROM blogs WHERE id=?", [id], this);
		},
		function(result) {
			if (result.length > 0) {
				blog = result[0];

				util.pagination("SELECT bp.*,u.username as username FROM blogposts bp LEFT JOIN users u ON u.id=bp.uid WHERE bp.bid=?", "SELECT count(bp.id) as cnt FROM blogposts bp WHERE bp.bid=? ORDER BY bp.date DESC", [blog.id], page, perpage, this);
			} else {
				throw "We don't know what blog you were trying to access.";
			}
		},
		function(pagedata, lastpage) {
			blogposts = pagedata;
			numpages = lastpage;

			var next = this.group();

			// iterate over every blog post and get the number of comments
			for (var i=0;i<blogposts.length;i++) {
				console.log('comments for ' + blogposts[i].id);
				db.query("SELECT count(id) as cnt FROM comments WHERE master='blogpost_" + blogposts[i].id + "'", [], next());
			}
		},
		function(comments) {
			console.log(comments);
			res.send('k');
		},
		function() {
			res.render('blog', {blogdata: blog, posts: blogposts, lastpage: numpages, curpage: page});
		}
	);
*/

}
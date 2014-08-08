var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth'),
	comments = require('./comments')

var self = exports;

exports.list = function(req, res) {
	async.series({
		blogs: function(callback) {
			db.query("SELECT b.*,i.thumb140 as 140x140 FROM blogs b LEFT JOIN imageuploads i ON i.id=b.140x140 ORDER BY b.priority DESC", [], callback);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't fetch blog list.");

		res.render("blogs", {title:'Our Blogs', blogs:results.blogs})
	})
}

// ajax-only thing?
exports.setimage = function(req, res) {
	var err = function() {
		res.statusCode = 400;
		res.send("");
	}

	if (!util.isset(req.body.attachment))
		return err();

	var attachment = parseInt(req.body.attachment);

	var id = parseInt(req.params.id);
	if (!id)
		return util.error(null, req, res, "No valid blog ID supplied.");

	async.series({
		canedit: function(callback) {
			auth.permission(req, res, ["edit blog", id], callback);
		}
	}, function(e, results) {
		if (e) return err();

		if (!results.canedit)
			return err();

		db.query("UPDATE blogs SET `140x140`=? WHERE id=?", [attachment, id], function(e, results) {
			if (e) return err();

			res.statusCode = 200;
			res.send("done")
		})
	})
}

exports.submitpost = function(req, res) {
	if (!util.isset(req.params.id))
		return util.error(null, req, res, "No blog ID supplied.");

	var id = parseInt(req.params.id);
	if (!id)
		return util.error(null, req, res, "No valid blog ID supplied.");

	if (!util.isset(req.body.title))
		return util.error(null, req, res, "Title wasn't sent.");

	if (!util.isset(req.body.content))
		return util.error(null, req, res, "Content wasn't sent.");

	async.series({
		blogdata: function(callback) {
			db.query("SELECT * FROM blogs WHERE id=?", [id], callback);
		},
		canedit: function(callback) {
			auth.permission(req, res, ["edit blog", id], callback);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "That blog doesn't appear to exist.");

		if (!results.canedit) {
			return util.error(err, req, res, "You do not have permission to edit this blog.");
		}

		db.query("INSERT INTO blogposts (id, bid, title, msg, date, isnews, uid) VALUES (NULL, ?, ?, ?, ?, 0, ?)",
			[id, req.body.title, req.body.content, util.timeNow(), res.locals.__AUTH_USERDATA.id], // TODO: easier way to grab the id?
			function(err, rows) {
				if (err) return util.error(err, req, res, "Couldn't submit your post.")

				util.redirect(req, res, '/post/' + util.slug(rows.insertId, req.body.title))
			})
	})
}

exports.newpost = function(req, res) {
	if (!util.isset(req.params.id))
		return util.error(null, req, res, "No blog ID supplied.");

	var id = parseInt(req.params.id);
	if (!id)
		return util.error(null, req, res, "No valid blog ID supplied.");

	async.series({
		blogdata: function(callback) {
			db.query("SELECT * FROM blogs WHERE id=?", [id], callback);
		},
		canedit: function(callback) {
			auth.permission(req, res, ["edit blog", id], callback);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "That blog doesn't appear to exist.");

		if (!results.canedit) {
			return util.error(err, req, res, "You do not have permission to edit this blog.");
		}

		res.render('blognewpost', {title:'New Post', blog: results.blogdata[0]});
	})
}

exports.show = function(req, res) {
	var page;
	if (!util.isset(req.params.page))
		page = 1;
	else
		page = parseInt(req.params.page);

	if (!util.isset(req.params.id))
		return util.error(null, req, res, "No blog ID supplied.");

	var id = parseInt(req.params.id);
	if (!id)
		return util.error(null, req, res, "No valid blog ID supplied.");
	
	var perpage = 5;

	async.series({
		blogdata: function(callback) {
			db.query("SELECT b.*,i.thumb140 as 140x140 FROM blogs b LEFT JOIN imageuploads i ON b.140x140=i.id WHERE b.id=?", [id], callback);
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
		if (err) return util.error(err, req, res, "That blog doesn't appear to exist.");

		if (results.blogdata.length != 1) return util.error(err, req, res, "That blog doesn't appear to exist.");

		async.map(results.posts.rows, function(post, callback) {
			bbcode.parse(post.msg, function(err, data) {
				if (err) return callback(err);

				post.rawmsg = post.msg;
				post.msg = data;

				comments.getnum('blogpost_' + post.id, req, res, function(err, numcomments) {
					if (err) return callback(err);

					post.numcomments = numcomments;
					callback(null, post);
				})
			});
		}, function(err, posts) {
			if (err) return util.error(err, req, res, "BBcode parser failed!");

			res.render('blog', {title:results.blogdata[0].name, blogdata: results.blogdata[0], posts: posts, lastpage: results.posts.pages, curpage: page, canedit: results.canedit});
		})
	})
}
var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth')

var self = exports;

exports.list = function(req, res) {
	async.series({
		blogs: function(callback) {
			db.query("SELECT * FROM blogs ORDER BY priority DESC", [], callback);
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

	var attachment = req.body.attachment;

	if (!attachment.match(/^[a-fA-F0-9]{32}$/))
		return err();

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

				util.redirect(req, res, '/post/' + rows.insertId)
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
		if (err) return util.error(err, req, res, "That blog doesn't appear to exist.");

		if (results.blogdata.length != 1) return util.error(err, req, res, "That blog doesn't appear to exist.");

		async.map(results.posts.rows, function(post, callback) {
			bbcode.parse(post.msg, function(err, data) {
				if (err) return callback(err);

				post.rawmsg = post.msg;
				post.msg = data;
				callback(null, post);
			});
		}, function(err, posts) {
			if (err) return util.error(err, req, res, "BBcode parser failed!");

			res.render('blog', {title:results.blogdata[0].name, blogdata: results.blogdata[0], posts: posts, lastpage: results.posts.pages, curpage: page, canedit: results.canedit});
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
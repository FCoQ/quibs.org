var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js')

var self = exports;

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

			res.render('blog', {title:'Blog', blogdata: results.blogdata[0], posts: posts, lastpage: results.posts.pages, curpage: page});
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
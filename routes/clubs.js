var db = require('../db'),
	util = require('../util'),
	auth = require('../auth'),
	async = require('async'),
	bbcode = require('../bbcode'),
	comments = require('./comments')

var self = exports;

exports.ban = function(req, res) {
	var id = parseInt(req.params.id);
	var uid = parseInt(req.body.uid);

	async.series({
		club: function(cb) {
			db.query("SELECT * FROM clubs WHERE id=?", [id], cb)
		},
		user: function(cb) {
			db.query("SELECT * FROM users WHERE id=?", [uid], cb)
		},
		canedit: function(cb) {
			auth.permission(req, res, ["edit club", id], cb);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Error getting club information.");

		if (!results.club.length) {
			return util.error(null, req, res, "That club doesn't exist!")
		}

		if (!results.user.length) {
			return util.error(null, req, res, "That user doesn't exist!")
		}

		if (!results.canedit) {
			res.locals.msg = "You can't edit this club, you're not a leader!";
			return util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		}

		auth.set(["club banned", uid, id], function(err) {
			res.locals.msg = "User was banned from the club!";
			return util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		});
	})
}

exports.discussion = function(req, res) {
	var id = parseInt(req.params.id);

	async.series({
		club: function(cb) {
			db.query("SELECT * FROM clubs WHERE id=?", [id], cb)
		},
		canview: function(cb) {
			auth.permission(req, res, ["view club discussion", id], cb);
		},
		comment_tree: function(cb) {
			comments.fetchTree(req, res, "club_" + id, cb);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Error getting club information.");

		if (!results.club.length) {
			return util.error(null, req, res, "That club doesn't exist!")
		}

		if (!results.canview) {
			res.locals.msg = "You can't look at the club discussion until you join the club.";
			return util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		}

		var club = results.club[0];

		res.render("clubdiscussion", {title: 'Discussion - ' + club.name, club: club, tree: results.comment_tree})
	})
}

exports.edit = function(req, res) {
	var id = parseInt(req.params.id);
	var information = String(req.body.content);

	async.series({
		club: function(cb) {
			db.query("SELECT * FROM clubs WHERE id=?", [id], cb)
		},
		canedit: function(cb) {
			auth.permission(req, res, ["edit club", id], cb);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Error getting club information.");

		if (!results.club.length) {
			return util.error(null, req, res, "That club doesn't exist!")
		}

		if (!results.canedit) {
			res.locals.msg = "You can't edit this club, you're not a leader!";
			return util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		}

		db.query("UPDATE clubs SET information=? WHERE id=?", [information, id], function(err) {
			if (err) {
				res.locals.msg = "Couldn't update club information, try again later."
			} else {
				res.locals.msg = "Updated club information!"
			}

			util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		})
	})
}

exports.join = function(req, res) {
	var id = parseInt(req.params.id);

	async.series({
		club: function(cb) {
			db.query("SELECT * FROM clubs WHERE id=?", [id], cb)
		},
		canjoin: function(cb) {
			auth.permission(req, res, ["join club", id], cb);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't join club, try again later.");

		if (!results.club.length) {
			return util.error(null, req, res, "That club doesn't exist!");
		}

		if (!results.canjoin) {
			res.locals.msg = "You can't join this club, you're banned! Contact a club leader for help.";
			return util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		}

		auth.set(["club member", res.locals.__AUTH_USERDATA.id, id], function(err) {
			if (err) {
				res.locals.msg = "Error: Couldn't join club, try again later."
			} else {
				res.locals.msg = "You've joined this club!"
			}

			util.redirect(req, res, "/club/" + util.slug(results.club[0].id, results.club[0].name))
		})
	})
}

exports.list = function(req, res) {
	db.query("SELECT * FROM clubs ORDER BY `order` DESC", [], function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't get club list.");

		var leaders = {};

		auth.find(["club leaders"], function(err, aleaders) {
			aleaders.forEach(function(leader) {
				if (leaders[leader.clubid] == undefined)
					leaders[leader.clubid] = {};

				leaders[leader.clubid][leader.uid] = leader.username;
			})

			res.render("clubs", {title:'Club Hub',clubs:results,leaders:leaders});
		})
	})
}

exports.view = function(req, res) {
	var id = parseInt(req.params.id);

	if (!id) return util.error(null, req, res, "Invalid club ID.")

	db.query("SELECT * FROM clubs WHERE id=?", [id], function(err, results) {
		if (err) return util.error(err, req, res, "We couldn't find the club you asked for.");

		var clubinfo = results[0];

		if (clubinfo == undefined) return util.error(err, req, res, "We couldn't find the club you asked for.");

		async.series({
			leaders: function(cb) {
				auth.find(["club leaders", id], cb);
			},
			members: function(cb) {
				auth.find(["club members", id], cb);
			},
			bbcode: function(cb) {
				bbcode.parse(clubinfo.information, cb)
			}
		}, function(err, results) {
			if (err) return util.error(err, req, res, "We couldn't load the club data.");

			// are we a leader?
			var iamleader = false;
			results.leaders.forEach(function(leader) {
				if (leader.uid == res.locals.__AUTH_USERDATA.id)
					iamleader = true;
			})

			// are we a member?
			var iammember = iamleader;
			results.members.forEach(function(member) {
				if (member.uid == res.locals.__AUTH_USERDATA.id)
					iammember = true;
			})

			res.render("club", {title:clubinfo.name, club:clubinfo, leaders:results.leaders, members:results.members, bbcode: results.bbcode, iamleader: iamleader, iammember: iammember});
		})
	})
}
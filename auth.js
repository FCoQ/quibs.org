var async = require('async')
  , util = require('./util')
  , db = require('./db')

var self = exports;

// rebuild authentication (perhaps the page updated the user account info)
exports.rebuild = function(req, res, next) {
	delete res.locals.__AUTH_LOGGED_IN;
	self.build(req, res, next);
}

// build authentication, this is middleware for building auth from cookie data
exports.build = function (req, res, next) {
	if (util.isset(res.locals.__AUTH_LOGGED_IN))
		return next();

	res.locals.__AUTH_USERDATA = {};
	res.locals.__AUTH_LOGGED_IN = false;
	res.locals.__AUTH_PERMISSIONS = {1:{}, 2:{}};

	if (!util.isset(req.cookies.email) || !util.isset(req.cookies.pass))
		return next();

	async.series({
		userdata: function(callback) {
			db.query("SELECT u.*,i.thumb64 as avatar FROM users u LEFT JOIN imageuploads i ON i.id=u.avatar WHERE email=?", [req.cookies.email], callback);
		},
		permissions: function(callback) {
			db.query("SELECT p.uid as `uid`, p.type as `type`, p.obj as `obj`, p.level as `level` FROM userpermissions p LEFT JOIN users u ON p.uid=u.id WHERE u.email=?", [req.cookies.email], callback);
		}
	}, function(err, results) {
		if (util.isset(results.userdata.length) && (results.userdata.length > 0)) {
			results.userdata = results.userdata[0];
			if (results.userdata.pass == req.cookies.pass) {
				res.locals.__AUTH_LOGGED_IN = true;
				res.locals.__AUTH_USERDATA = results.userdata;

				// results.permissions contains a list of {uid,type,obj,level}
				results.permissions.forEach(function(perm) {
					if (typeof res.locals.__AUTH_PERMISSIONS[perm.type] == "undefined") {
						res.locals.__AUTH_PERMISSIONS[perm.type] = {};
					}

					res.locals.__AUTH_PERMISSIONS[perm.type][perm.obj] = perm.level;
				})

				if (results.userdata.grp == 1) {
					res.locals.alt_msg = "Please <a href=\"/verify\">verify</a> your email address.";
				}

				// are we on a new ip now
				if (res.locals.__AUTH_USERDATA.ip_lastlog != util.ip(req)) {
					db.query("UPDATE users SET ip_lastlog=? WHERE id=?", [util.ip(req), res.locals.__AUTH_USERDATA.id], function() {
						next();
					})
				} else {
					next();
				}
			} else {
				next();
			}
		} else {
			next();
		}
	});
}

// TODO factor this into auth.build
exports.verify = function(email, pass, next) {
	db.query("SELECT * FROM users WHERE email=?", [email], function(err, results) {
		if (err) return next(err);

		if (results.length != 1) return next(null, false);

		var user = results[0];

		if (user.pass == pass) {
			return next(null, user);
		} else {
			return next(null, false);
		}
	})
}

// require authentication for the page, forces a build() if it hasn't already
exports.require = function(req, res, next) {
	self.build(req, res, function() {
		if (res.locals.__AUTH_LOGGED_IN == false) {
			util.redirect(req, res, '/login');
		} else {
			next();
		}
	});
}

exports.set = function(auth, next) {
	var attribute = auth[0];
	var uid = auth[1];
	var object = auth[2];

	var upsert = function(uid, type, obj, level) {
		db.query("INSERT INTO userpermissions (uid, type, obj, level) VALUES (?, ?, ?, ?)",
			[uid, type, object, level],
			function() {
				db.query("UPDATE userpermissions SET level=? WHERE uid=? AND obj=? AND type=?",
					[level, uid, obj, type],
					next);
			});
	}

	switch (attribute) {
		case "club member":
			upsert(uid, 2, object, 1);
		break;
		case "club leader":
			upsert(uid, 2, object, 2);
		break;
		case "club banned":
			upsert(uid, 2, object, 0);
		break;
	}
}

// finds all users with certain permissions
exports.find = function(auth, next) {
	var selector = auth[0];
	var object = auth[1];

	var getClubUsers = function(level) {
		if (object == undefined) {
			db.query(
				"select p.obj as clubid, u.username, u.id as uid from clubs c left join userpermissions p on p.obj=c.id left join users u on u.id=p.uid where p.type=2 and p.level=?",
				[level],
				function(err, results) {
					if (err) return next(err);

					next(null, results); // [{clubid,username,uid}]
				}
				)
		} else {
			db.query(
				"select p.obj as clubid, u.username, u.id as uid from clubs c left join userpermissions p on p.obj=c.id left join users u on u.id=p.uid where p.type=2 and p.obj=? and p.level=?",
				[object, level],
				function(err, results) {
					if (err) return next(err);

					next(null, results); // [{clubid,username,uid}]
				}
				)
		}
	}

	switch (selector) {
		case "club leaders":
			getClubUsers(2);
		break;
		case "club members":
			getClubUsers(1);
		break;
		case "club banned":
			getClubUsers(0);
		break;
	}
}

/*
	get permissions for the user

	(req, res, ["edit blog", 10], function(err, ok) {
		if (err)
		if (!ok) return util.error...
		
	})
*/
exports.permission = function(req, res, auth, next) {
	var action = auth[0];
	var object = auth[1];

	// TYPES:
	//  1 = blog
	//  2 = club

	switch (action) {
		case "upload gallery image":
			if (!res.locals.__AUTH_LOGGED_IN) {
				return next(null, false);
			}

			if (res.locals.__AUTH_USERDATA.grp < 2) {
				next(null, false); // you need verified email
			} else {
				next(null, true);
			}
		break;
		case "view club discussion":
			if (res.locals.__AUTH_PERMISSIONS[2][object] >= 1) {
				next(null, true)
			} else {
				next(null, false)
			}
		break;
		case "edit club":
			if (res.locals.__AUTH_PERMISSIONS[2][object] == 2) {
				next(null, true)
			} else {
				next(null, false)
			}
		break;
		case "join club":
			if (res.locals.__AUTH_PERMISSIONS[2][object] == 0) {
				next(null, false)
			} else {
				next(null, true)
			}
		break;
		case "edit blog":
			if (res.locals.__AUTH_USERDATA.grp == 3) {
				next(null, true);
			} else if (res.locals.__AUTH_PERMISSIONS[1][object] >= 2) {
				next(null, true);
			} else {
				next(null, false);
			}
		break;
		case "delete comment":
			if (res.locals.__AUTH_USERDATA.grp == 3) {
				next(null, true); // admins can edit all comments
			} else {
				next(null, false);
			}
		break;
		case "edit comment":
			var comment = object;

			if (comment.uid == res.locals.__AUTH_USERDATA.id) {
				next(null, true); // you can edit your own comments
			} else if (res.locals.__AUTH_USERDATA.grp == 3) {
				next(null, true); // admins can edit all comments
			} else {
				next(null, false);
			}
		break;
		case "submit comment":
			if (!res.locals.__AUTH_LOGGED_IN) {
				return next(null, false);
			}

			return self.permission(req, res, ["view master", object], next);
		break;
		case "view comments":
			return self.permission(req, res, ["view master", object], next);
		break;
		case "view master":
			var master = object.split("_");

			switch (master[0]) {
				case "blogpost":
					var bpid = parseInt(master[1]);

					next(null, true);
				break;
				case "image":
					var iid = parseInt(master[1]);

					next(null, true);
				break;
				case "club":
					var clubid = parseInt(master[1]);

					self.permission(req, res, ["view club discussion", clubid], next)
				break;
			}
		break;
	}
}
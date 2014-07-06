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
			db.query("SELECT * FROM users WHERE email=?", [req.cookies.email], callback);
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
			}
		}
		next();
	});
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
		case "edit blog":
			if (res.locals.__AUTH_USERDATA.grp == 3) {
				next(null, true);
			} else if (res.locals.__AUTH_PERMISSIONS[1][object] >= 2) {
				next(null, true);
			} else {
				next(null, false);
			}
		break;
	}
}
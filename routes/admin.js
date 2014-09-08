var db = require('../db')
  , util = require('../util')


exports.front = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		res.locals.msg = "Admin panel is restrict to... well, admins.";
		return util.redirect(req, res, "/");
	}

	res.render("admin_front", {title: 'Admin', adminpage: 'front'});
}

exports.womp = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		res.locals.msg = "Admin panel is restrict to... well, admins.";
		return util.redirect(req, res, "/");
	}

	db.query("SELECT * FROM ipbans WHERE expires>? ORDER BY added ASC", [util.timeNow()], function(err, result) {
		if (err) return util.error(err, req, res, "Couldn't get a list of ipbans.");

		res.render("admin_womp", {title: 'Admin', adminpage: 'womp', ipbans: result});
	})
}

exports.wompdelete = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		res.locals.msg = "Admin panel is restrict to... well, admins.";
		return util.redirect(req, res, "/");
	}

	var ip = String(req.body.ip);

	db.query("DELETE FROM ipbans WHERE ip=?", [ip], function(err) {
		if (err) return util.error(err, req, res, "Couldn't ban that IP address for some reason.");

		res.locals.msg = "IP address " + ip + " was removed from the womp list.";
		util.redirect(req, res, "/admin/womp");
	})
}

exports.wompadd = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		res.locals.msg = "Admin panel is restrict to... well, admins.";
		return util.redirect(req, res, "/");
	}

	var newip = String(req.body.ip);
	var note = String(req.body.note);

	db.query("INSERT INTO ipbans (ip, note, expires, added) VALUES (?, ?, ?, ?)", [newip, note, util.timeNow() + (31556940 * 8), util.timeNow()], function(err) {
		if (err) return util.error(err, req, res, "Couldn't add that IP to the womp list.");

		res.locals.msg = "IP address " + newip + " was added to the womp list.";
		util.redirect(req, res, "/admin/womp");
	})
}
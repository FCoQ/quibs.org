var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	notifications = require('./notifications')

var self = exports;

exports.delete = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		return util.ajax.error(req, res);
	}

	var id = parseInt(req.body.id);

	db.query("DELETE FROM grants WHERE id=?", [id], function(err) {
		if (err) return util.ajax.error(req, res);

		util.ajax.success(req, res);
	})
}

exports.approve = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		return util.ajax.error(req, res);
	}

	var id = parseInt(req.body.id);

	db.query("UPDATE grants SET status=? WHERE id=?", [2, id], function(err) {
		if (err) return util.ajax.error(req, res);

		util.ajax.success(req, res);
	})
}

exports.reject = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		return util.ajax.error(req, res);
	}

	var id = parseInt(req.body.id);

	db.query("UPDATE grants SET status=? WHERE id=?", [1, id], function(err) {
		if (err) return util.ajax.error(req, res);

		util.ajax.success(req, res);
	})
}

exports.submitgrant = function(req, res) {
	if (!res.locals.__RECAPTCHA) {
		res.locals.msg = 'Error: the CAPTCHA you provided was wrong. Try again.';
		util.redirect(req, res, '/grants')
	} else if (!req.body.name.match(/^[a-zA-Z0-9 ]{1,25}$/)) {
		res.locals.msg = 'Error: the name you provided was wrong. Try again.';
		util.redirect(req, res, '/grants')
	} else {
		db.query("INSERT INTO grants (date, name, msg, ip) VALUES (?, ?, ?, ?)", [util.timeNow(), req.body.name, req.body.msg, util.ip(req)], function(err, r) {
			if (err) res.locals.msg = "Grant wasn't posted for some reason...";
			else res.locals.msg = 'Success! Grant posted.';

			notifications.send("grant", 1, r.insertId, function() {
				util.redirect(req, res, '/grants')
			})
		});
	}
}

exports.show = function(req, res) {
	var page = req.params.page;
	if (typeof(page) == 'undefined')
		page = 1;
	else
		page = parseInt(page);

	var show = req.params.type;
	var perpage = 10;
	var lastpage = 0;
	var grants = [];

	var render = function(err, pagedata) {
		if (err) return util.error(err, req, res, "Couldn't load grants.");

		res.render('grants', {title:'Grants', show: show, curpage: page, lastpage: pagedata.pages, grants: pagedata.rows});
	};

	switch (show) {
		case 'processed':
			util.pagination("SELECT * FROM grants WHERE status!=0 ORDER BY date DESC", "SELECT count(id) as cnt FROM grants WHERE status!=0", [], page, perpage, render);
		break;
		default:
			show = 'pending';
			util.pagination("SELECT * FROM grants WHERE status=0 ORDER BY date DESC", "SELECT count(id) as cnt FROM grants WHERE status=0", [], page, perpage, render);
	}
}
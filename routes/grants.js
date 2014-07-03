var db = require('../db'),
	util = require('../util'),
	async = require('async')

var self = exports;

exports.submitgrant = function(req, res) {
	if (!res.locals.__RECAPTCHA) {
		res.locals.msg = 'Error: the CAPTCHA you provided was wrong. Try again.';
		util.redirect(req, res, '/grants')
	} else if (!req.body.name.match(/^[a-zA-Z0-9 ]{1,25}$/)) {
		res.locals.msg = 'Error: the name you provided was wrong. Try again.';
		util.redirect(req, res, '/grants')
	} else {
		db.query("INSERT INTO grants (date, name, msg, ip) VALUES (?, ?, ?, ?)", [util.timeNow(), req.body.name, req.body.msg, req.connection.remoteAddress], function(err) {
			if (err) res.locals.msg = "Grant wasn't posted for some reason...";
			else res.locals.msg = 'Success! Grant posted.';

			util.redirect(req, res, '/grants')
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
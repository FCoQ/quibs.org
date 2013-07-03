var db = require('../db'),
	util = require('../util'),
	step = require('step')
/*
 * GET home page.
 */

var self = exports;

exports.index = function(req, res) {
  step(
  	function() {
  		db.query("SELECT c.`text` as `text`,u.username as username FROM quotes c LEFT JOIN users u ON u.id=c.uid", [], this);
  	},
  	function(quotes) {
  		res.locals.randomquote = util.randomElement(quotes);
  		db.query("SELECT * FROM clubs", [], this);
  	},
  	function(clubs) {
  		res.locals.clubs = clubs;
  		res.render('index', {title:'It hurts when I pee.'});
  	}
  );
};

exports.fund = function(req, res) {
  res.render('fund', {title:'Fund'});
};

// TODO, error handling?
exports.submitgrant = function(req, res) {
	if (!res.locals.__RECAPTCHA) {
		res.locals.msg = 'Error: the CAPTCHA you provided was wrong. Try again.';
	} else if (!req.body.name.match(/^[a-zA-Z0-9 ]{1,25}$/)) {
		res.locals.msg = 'Error: the name you provided was wrong. Try again.';
	} else {
		res.locals.msg = 'Success! Grant posted.';
	}
	self.grants(req, res);
}

exports.grants = function(req, res) {
	var page = req.params.page;
	if (typeof(page) == 'undefined')
		page = 1;
	else
		page = parseInt(page);

	var show = req.params.type;
	var perpage = 10;
	var lastpage = 0; // get this
	var grants = []; // get these

	step(
		function() {
			switch(show) {
				case 'processed':
					db.query("SELECT * FROM grants WHERE status!=0 ORDER BY date DESC LIMIT ?,?", [(page-1)*perpage, perpage], this);
				break;
				default:
					show = 'pending';
					// pending
					db.query("SELECT * FROM grants WHERE status=0 ORDER BY date DESC LIMIT ?,?", [(page-1)*perpage, perpage], this);
			}
		},
		function(result) {
			grants = result;
			// get a number of list of grants in total
			switch (show) {
				case 'processed':
					db.query("SELECT count(id) as cnt FROM grants WHERE status!=0", [], this);
				break;
				case 'pending':
					db.query("SELECT count(id) as cnt FROM grants WHERE status=0", [], this)
				break;
			}
		},
		function(result) {
			lastpage = Math.ceil(result[0].cnt / perpage);
			res.render('grants', {show: show, curpage: page, lastpage: lastpage, grants: grants});
		}
	)
}
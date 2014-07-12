var db = require('../db'),
	util = require('../util'),
	async = require('async')
/*
 * GET home page.
 */

var self = exports;

exports.index = function(req, res) {
	async.series({
		quotes: function(callback) {
			db.query("SELECT c.`text` as `text`,u.username as username FROM quotes c LEFT JOIN users u ON u.id=c.uid", [], callback);
		},
		clubs: function(callback) {
			db.query("SELECT * FROM clubs ORDER BY `order` DESC", [], callback);
		}
	}, function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't render index page, try again later.");

		res.render('index', {title:'It hurts when I pee.', clubs:results.clubs, randomquote:util.randomElement(results.quotes)});
	});
};

exports.fund = function(req, res) {
  res.render('fund', {title:'Fund'});
};

exports.grants = require('./grants')
exports.blog = require('./blog') // todo: might as well merge this with blogpost anyway
exports.blogpost = require('./blogpost')
exports.comments = require('./comments')
exports.gallery = require('./gallery')
exports.user = require('./user')

var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	bbcode = require('../bbcode.js'),
	auth = require('../auth')

var self = exports;

exports.show = function(req, res) {
	var page = parseInt(req.params[1]);
	if (!page)
		page = 1;

	var start = (page - 1) * 9;

	db.query("SELECT g.*, u.username as username FROM images g LEFT JOIN users u ON u.id=g.uid ORDER BY g.time DESC LIMIT ?,9", [start], function(err, results) {
		results = results.map(function(v) {
			if (!v.username) {
				v.username = "Dobby";
			}

			return v;
		})
		res.render("gallery", {page: page, title:'Gallery', images:results});
	})
}
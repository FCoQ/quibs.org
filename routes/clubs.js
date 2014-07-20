var db = require('../db'),
	util = require('../util'),
	auth = require('../auth'),
	async = require('async')

var self = exports;

exports.list = function(req, res) {
	db.query("SELECT * FROM clubs", [], function(err, results) {
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
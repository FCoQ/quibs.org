var db = require('../db')
  , util = require('../util')

exports.show = function(req, res) {
	db.query("SELECT q.*, u.username as username FROM quotes q LEFT JOIN users u ON u.id=q.uid ORDER BY id DESC", [], function(err, results) {
		if (err) return util.error(err, req, res, "Couldn't get quotes.");

		res.render("quotes", {title:'What they say', quotes:results});
	})
}

exports.delete = function(req, res) {
	if (res.locals.__AUTH_USERDATA['grp'] != 3) {
		return util.ajax.error(req, res);
	}

	var id = parseInt(req.body.id);

	db.query("DELETE FROM quotes WHERE id=?", [id], function(err, results) {
		if (err) return util.ajax.error(req, res);

		util.ajax.success(req, res);
	})
}
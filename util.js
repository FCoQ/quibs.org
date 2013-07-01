var auth = require('./auth'),
	step = require('step'),
	db = require('./db')

exports.redirect = function(req, res, path) {
	if (res.locals.__REQUEST_TYPE == 'ajax')
		res.render('redirect', {'path':'/login'});
	else
		res.redirect(path);
}

exports.prepareLayout = function(req, res, next) {
	if (res.locals.__REQUEST_TYPE == 'normal') {
		step(
			function() {
				auth.build(req, res, this); // build authentication
			},
			function () {
				db.query("SELECT id,name FROM blogs", [], this);
			},
			function(rows) {
				res.locals.main_blogs = rows;
				db.query("SELECT username FROM users ORDER BY id DESC LIMIT 3", [], this);
			},
			function (users) {
				res.locals.main_lastusers = users;
				next();
			}
		);
	} else {
		next();
	}
};
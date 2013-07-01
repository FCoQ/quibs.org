exports.redirect = function(req, res, path) {
	if (res.locals.__REQUEST_TYPE == 'ajax')
		res.render('redirect', {'path':'/login'});
	else
		res.redirect(path);
}
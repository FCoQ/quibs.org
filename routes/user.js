var db = require('../db'),
	util = require('../util'),
	async = require('async'),
	check = require('validator'),
	crypto = require('crypto')

var self = exports;

var verifyCode = function(req, res, callback) {
	var confirm_code = String(req.params.code);

	if (!confirm_code.match(/^[a-z0-9]{12}$/)) {
		res.locals.msg = "Invalid verification code."
		util.redirect(req, res, '/');
		return;
	}

	db.query("SELECT * FROM users WHERE name_register=?", [confirm_code], function(err, results) {
		if (err || (results.length != 1)) {
			res.locals.msg = "Verification code was invalid or expired, please try again."
			util.redirect(req, res, '/');
			return;
		}

		callback(results[0]);
	})
}

exports.verify = function(req, res) {
	verifyCode(req, res, function(user) {
		db.query("UPDATE users SET `grp`=2, `name_register`=? WHERE id=?", ["used", user.id], function(err, results) {
			if (err) return util.error(err, req, res, "There was a problem updating the database.")

			res.locals.msg = "Your email has been verified. Thank you!"
			util.redirect(req, res, '/');
			return;
		})
	})
}

exports.reset = function(req, res) {
	verifyCode(req, res, function(user) {
		res.render("reset", {title:"Change Password",code:req.params.code})
	})
}

exports.reset_submit = function(req, res) {
	var password = String(req.body.password)

	verifyCode(req, res, function(user) {
		if (password.length < 6) {
			res.locals.msg = "Your password needs to be at least six characters long, try again."
			util.redirect(req, res, "/reset/" + req.params.code)
			return;
		}
		var sha1 = crypto.createHash('sha1');
		sha1.update(password);
		var hashed_password = sha1.digest('hex');

		db.query("UPDATE users SET pass=?, name_register=? WHERE id=?", [hashed_password, "used", user.id], function(err, results) {
			res.locals.msg = "Your password has been changed, now try to log in."
			util.redirect(req, res, "/login")
		})
	})
}

exports.forgot = function(req, res) {
	if (res.locals.__AUTH_LOGGED_IN) {
		res.locals.msg = "You're logged in already!"
		util.redirect(req, res, "/")
		return;
	}

	res.render("forgot", {title:"Forgot Password"})
}

exports.forgot_submit = function(req, res) {
	var email = String(req.body.email)

	var confirm_code = new Array(13).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 12);

	db.query("SELECT * FROM users WHERE email=?", [email], function(err, results) {
		if (err || (results.length != 1)) {
			res.locals.msg = "No user signed up with that email, try again."
			util.redirect(req, res, "/forgotpassword")
			return;
		}
		var u = results[0];

		db.query("UPDATE users SET name_register=? WHERE id=?", [confirm_code, u.id], function(err, results) {
			// TODO: send email
			res.locals.msg = "Check your email to reset your password."
			util.redirect(req, res, "/")
		})
	})
}

exports.register = function(req, res) {
	if (res.locals.__AUTH_LOGGED_IN) {
		res.locals.msg = "You're logged in already!"
		util.redirect(req, res, "/")
		return;
	}

	res.render("register", {title: "Register with the Church"});
}

exports.login = function(req, res) {
	if (res.locals.__AUTH_LOGGED_IN) {
		res.locals.msg = "You're logged in already!"
		util.redirect(req, res, "/")
		return;
	}

	res.render("login", {title: "Log in"});
}

exports.login_submit = function(req, res) {
	var username = String(req.body.username)
	var password = String(req.body.password)

	var sha1 = crypto.createHash('sha1');
	sha1.update(password);
	var hashed_password = sha1.digest('hex');

	db.query("SELECT * FROM users WHERE username=? AND pass=?", [username, hashed_password], function(err, results) {
		if (err || (results.length != 1)) {
			res.locals.msg = "Invalid username or password.";
			util.redirect(req, res, "/login")
			return;
		}

		var userdata = results[0];

		res.cookie('email', userdata.email, {maxAge: 94636000000})
		res.cookie('pass', userdata.pass, {maxAge: 94636000000})

		util.redirect(req, res, "/", true)
	})
}

exports.logout = function(req, res) {
	res.cookie('email', '', {maxAge: -1})
	res.cookie('pass', '', {maxAge: -1})
	
	util.redirect(req, res, "/", true)
}

exports.register_submit = function(req, res) {
	var username = String(req.body.username)
	var password = String(req.body.password)
	var email = String(req.body.email)

	if (password.length < 6) {
		res.locals.msg = "Your password needs to be at least six characters long, try again."
		util.redirect(req, res, "/register")
		return;
	}

	if (!username.match(/^[a-zA-Z0-9]{3,25}$/)) {
		res.locals.msg = "The username you submitted was invalid, try again."
		util.redirect(req, res, "/register")
		return;
	}

	if (!check.isEmail(email)) {
		res.locals.msg = "The email you submitted was invalid, try again."
		util.redirect(req, res, "/register")
		return;
	}

	// TODO: enable captcha when testing is done
	/*if (!res.locals.__RECAPTCHA) {
		res.locals.msg = "The CAPTCHA you entered was invalid, try again."
		util.redirect(req, res, "/register")
		return;
	}*/

	var confirm_code = new Array(13).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 12);

	var sha1 = crypto.createHash('sha1');
	sha1.update(password);
	var hashed_password = sha1.digest('hex');

	// TODO: stealing the name_register field to use as confirm_code
	db.query("INSERT INTO users (username, pass, email, grp, ip_register, name_register) VALUES (?, ?, ?, ?, ?, ?)",
	[username, hashed_password, email, 1, req.connection.remoteAddress, confirm_code], function(err, result) {
		if (err) {
			res.locals.msg = "You may have you already used that email or username before, try again."
			util.redirect(req, res, "/register")
			return;
		}

		res.cookie('email', email, {maxAge: 94636000000})
		res.cookie('pass', hashed_password, {maxAge: 94636000000})
		
		// TODO: email verification
		util.redirect(req, res, "/verify/" + confirm_code, true)
	})
}
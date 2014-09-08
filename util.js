var auth = require('./auth'),
	async = require('async'),
	db = require('./db'),
	Recaptcha = require('recaptcha').Recaptcha

var RECAPTCHA_PUBLIC_KEY = "6LfX7vISAAAAAGFqn4yRgOGpx6zfIG05XxBgN0Tz";
var RECAPTCHA_PRIVATE_KEY = process.env.PRIVATEKEY;

var self = exports;

// TODO: do better than this
exports.error = function(err, req, res, readable) {
	console.log("--------------------\n" + err + "\n--------------------");
	res.render('error', {readable: readable});
}

/**
pagination:
query = "SELECT * FROM grants WHERE derp=?" (example)
countquery = "SELECT count(id) as cnt WHERE derp!=?"
params = [] params for query
curpage = 1
perpage = 10
callback = function(pagedata, lastpage)
**/
exports.pagination = function(query, countquery, params, curpage, perpage, after) {
	async.series({
		page: function(callback) {
			db.query(query + " LIMIT ?,?", params.concat([(curpage-1)*perpage, perpage]), callback);
		},
		count: function(callback) {
			db.query(countquery, params, callback);
		}
	}, function(err, results) {
		if (err) return after(err, {});

		after(null, {rows: results.page, pages: Math.ceil(results.count[0].cnt / perpage)});
	});
}

exports.attachment = function(url, size) {
	if (!url) {
		return "/img/placeholder_bg.jpg";
	}

	return url;
}

exports.ip = function(req) {
	return req.headers['x-real-ip'];
}

exports.slug = function(base, w) {
	return base + "-" + function(str) {
	  str = str.replace(/^\s+|\s+$/g, ''); // trim
	  str = str.toLowerCase();

	  // remove accents, swap ñ for n, etc
	  var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
	  var to   = "aaaaaeeeeeiiiiooooouuuunc------";
	  for (var i=0, l=from.length ; i<l ; i++) {
	    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
	  }

	  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
	    .replace(/\s+/g, '-') // collapse whitespace and replace by -
	    .replace(/-+/g, '-'); // collapse dashes

	  return str;
	}(w);
}

exports.timeNow = function() {
	return Math.floor(new Date().getTime()/1000);
}

// todo: integrate this with timeSince?
exports.timeUntil = function(timestamp) {
	var seconds = Math.floor((timestamp - (new Date().getTime()/1000)));
	var interval = Math.floor(seconds / 31536000);

	if (interval > 1) {
        return interval + " years from now";
    } else if (interval == 1) {
    	return interval + " year from now";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months from now";
    } else if (interval == 1) {
    	return interval + " month from now";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days from now";
    } else if (interval == 1) {
    	return interval + " day from now";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours from now";
    } else if (interval == 1) {
    	return interval + " hour from now";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes from now";
    } else if (interval == 1) {
    	return interval + " minute from now";
    }
    if (Math.floor(seconds) == 1) {
    	return Math.floor(seconds) + " second from now";
    } else {
    	return Math.floor(seconds) + " seconds from now";
    }
}

exports.timeSince = function(timestamp) {
    var seconds = Math.floor(((new Date().getTime()/1000) - timestamp));

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years ago";
    } else if (interval == 1) {
    	return interval + " year ago";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months ago";
    } else if (interval == 1) {
    	return interval + " month ago";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days ago";
    } else if (interval == 1) {
    	return interval + " day ago";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours ago";
    } else if (interval == 1) {
    	return interval + " hour ago";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes ago";
    } else if (interval == 1) {
    	return interval + " minute ago";
    }
    if (Math.floor(seconds) == 1) {
    	return Math.floor(seconds) + " second ago";
    } else {
    	return Math.floor(seconds) + " seconds ago";
    }
}

exports.token = function() {
	return new Array(13).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, 12);
}

exports.isValidToken = function(code) {
	if (String(code).match(/^[a-z0-9]{12}$/))
		return true;
	else
		return false;
}

exports.isset = function(param) {
	if (typeof(param) == 'undefined')
		return false;

	return true;
}

exports.verifyRecaptcha = function(req, res, next) {
	res.locals.__RECAPTCHA = false;
	res.locals.__RECAPTCHA_PUBLIC_KEY = RECAPTCHA_PUBLIC_KEY;

	if (typeof(req.body.recaptcha_challenge_field) == 'undefined') {
		next();
		return;
	}

	if (typeof(req.body.recaptcha_response_field) == 'undefined') {
		next();
		return;
	}

	var data = {
		remoteip: self.ip(req),
		challenge: req.body.recaptcha_challenge_field,
		response: req.body.recaptcha_response_field
	};

	var _recaptcha = new Recaptcha(RECAPTCHA_PUBLIC_KEY, RECAPTCHA_PRIVATE_KEY, data);

	_recaptcha.verify(function(success, error_code) {
		if (success) {
			res.locals.__RECAPTCHA = true;
			next();
			return;
		} else {
			res.locals.__RECAPTCHA = false;
			next();
			return;
		}
	});
}

exports.repeat = function(string, num) {
	return new Array( num + 1 ).join( string );
}

exports.redirect = function(req, res, path, force) {
	if (!force) {
		res.render('redirect', {'path':path,force:false});
	} else {
		res.render('redirect', {'path':path,force:true});
	}
}

exports.escape = function (html){
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

exports.quote = function(html) {
	return JSON.stringify(String(html));
}

exports.nl2br_escape = function(str) {
	return self.escape(str).replace(/\n/g, "<br />");
}

exports.prepareLayout = function(req, res, next) {
	if (res.locals.__REQUEST_TYPE == 'normal') {
		async.series({
			auth: function (callback) {
				auth.build(req, res, function() {
					callback(null, []);
				});
			},
			lastusers: function(callback) {
				db.query("SELECT username FROM users ORDER BY id DESC LIMIT 3", [], callback);
			}
		}, function(err, results) {
			res.locals.main_lastusers = results.lastusers;
			next();
		});
	} else {
		next();
	}
};

exports.randomElement = function(array) {
	return array[Math.floor(Math.random()*array.length)]
}

exports.ajax = {
	error: function(req, res) {
		res.statusCode = 400;
		res.send("");
	},
	success: function(req, res) {
		res.send("");
	}
}
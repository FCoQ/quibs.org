var express = require('express')
  , http = require('http')
  , path = require('path')
  , crypto = require('crypto')
  , routes = require('./routes')
  , db = require('./db')
  , auth = require('./auth')
  , util = require('./util')

var app = express();

app.configure(function(){
	// all environments
	app.set('port', process.env.PORT || 80);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');

	app.use(express.cookieParser());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(util.verifyRecaptcha);
	app.use(function(req, res, next) {
		res.locals._nl2br_escape = util.nl2br_escape;
		res.locals._isset = util.isset;

		if (req.url.substring(0, 6) == '/ajax/') {
			req.url = req.url.substring(5);
			res.locals.__REQUEST_TYPE = 'ajax';
			res.locals.__REQUEST_URL = req.url;
		} else {
			res.locals.__REQUEST_TYPE = 'normal';
			res.locals.__REQUEST_URL = req.url;
		}
		next();
	});
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	app.use(function(err, req, res, next) {
		if (!err) return next();

		util.error(err, req, res);
	});
});

/// ROUTEWARE:
// auth.require - require authentication
// auth.build - build authentication
// util.prepareLayout - prepare layout (navbar, footer) if non-ajax request
app.get('/', util.prepareLayout, routes.index);

app.get('/fund', util.prepareLayout, routes.fund);

app.get('/grants/:type?/:page?', util.prepareLayout, auth.build, routes.grants.show);
app.post('/grants', util.prepareLayout, routes.grants.submitgrant);

app.get('/blog/:id/:page?', util.prepareLayout, auth.build, routes.blog.show);
//app.get('/panel', auth.require, routes.panel)

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

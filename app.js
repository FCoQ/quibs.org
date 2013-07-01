var express = require('express')
  , http = require('http')
  , path = require('path')
  , step = require('step')
  , routes = require('./routes')
  , db = require('./db');

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
	app.use(function(req, res, next) {
		if (req.url.substring(0, 6) == '/ajax/') {
			req.url = req.url.substring(5);
			res.locals.__REQUEST_TYPE = 'ajax';
			res.locals.__REQUEST_URL = req.url;
			next();
		} else {
			res.locals.__REQUEST_TYPE = 'normal';
			res.locals.__REQUEST_URL = req.url;

			// not an ajax request, so we'll need to do some db
			// queries for the main layout

			step(
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
		}
	});
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
});

app.get('/', routes.index);
app.get('/fund', routes.fund);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

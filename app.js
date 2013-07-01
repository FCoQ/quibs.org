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
		} else {
			res.locals.__REQUEST_TYPE = 'normal';
			// not an ajax request, so we'll need to do some db
			// queries for the main layout


		}
		res.locals.__REQUEST_URL = req.url;
		next();
	});
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
});

var pageCore = function(req, res, next) {
	if (res.locals.__REQUEST_TYPE == 'normal') {
		// this is a normal request, so we need to perform some db queries for the layout
		/*step(
			function () {

			}
		);*/
	}
};

app.get('/', routes.index);
app.get('/fund', routes.fund);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

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
		}
		next();
	});
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	// development only
	if ('development' == app.get('env')) {
	  app.use(express.errorHandler());
	}
});

app.get('/fund', function(req, res) {
	res.render('fund');
});

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

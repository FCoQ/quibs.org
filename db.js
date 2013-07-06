var mysql;
function connect() {
	mysql = require('mysql-native').createTCPClient('162.213.254.14', 3306);
	mysql.auto_prepare = true;
	mysql.auth('quibs', 'root', process.env.DBPASS);
}

function reset() {
	connect();
	mysql.on('error', function() {
		// reconnect to mysql
		reset();
	});
}

reset();

var self = exports;

exports.query = function(query, params, callback, last) {
	var rows = [];
	if (typeof(last) == 'undefined')
		last = false;

	console.log('PERFORMING QUERY ' + query);
	console.log('	PARAMS: ' + params);
	var cmd = mysql.execute(query, params);

	cmd.addListener('row', function(r) {
		rows.push(r);
	});
	cmd.addListener('end', function(r) {
		callback(null, rows);
	});
	cmd.addListener('error', function(err) {
		if (!last) {
			reset();
			self.query(query, params, callback, true);
		} else {
			callback(new Error("Query failed:\n" + query + "\nParams: " + JSON.stringify(params)), []);
		}
	});
}
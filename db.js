var mysql = require('mysql2');
var connection;

function connect() {
	console.log("Connecting to MySQL server...");
	connection = mysql.createConnection({
		host: '127.0.0.1',
		port: 3306,
		user: 'root',
		password: process.env.DBPASS,
		database: 'quibs'
	})

	connection.on('error', function(err, test) {
		console.log("Error connecting to MySQL server.");
		connect();
	})
}

connect();

exports.query = function(query, params, callback) {
	console.log('PERFORMING QUERY ' + query);
	console.log('	PARAMS: ' + params);

	connection.execute(query, params, function(err, rows, fields) {
		callback(err, rows);
	})
}
var mysql = require('mysql-native').createTCPClient('162.213.254.14', 3306);
mysql.auto_prepare = true;
mysql.auth('quibs', 'root', process.env.DBPASS);

exports.query = function(query, params, callback) {
	var rows = [];

	var cmd = mysql.execute(query, params);

	cmd.addListener('row', function(r) {
		rows.push(r);
	});
	cmd.addListener('end', function(r) {
		callback(rows);
	});
}
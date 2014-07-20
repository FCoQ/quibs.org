var db = require('./db')
  , async = require('async')
  , bitcoin = require('bitcoin')
  , request = require('request')
  , zlib = require('zlib')

module.exports = function(io) {
	setInterval(function() {
		var HISTORIC = "";

		request({
			url: 'http://s5.bitcoinwisdom.com/period?step=86400&sid=' + process.env.BWSESSION + '&symbol=bitstampbtcusd',
			gzip: false
		}).pipe(zlib.createGunzip()).on('data', function(data) {
			HISTORIC += data;
		}).on('end', function() {
			HISTORIC = JSON.parse(HISTORIC);

			async.mapSeries(HISTORIC, function(day, cb) {
				var date = Math.floor(day[0] / 86400) * 86400;
				var btcusd = day[4] * Math.pow(10, 8);

				var afewdaysago = Date.now() / 1000;
				afewdaysago -= 86400 * 2;
				if (afewdaysago < date) {
					db.query("INSERT INTO fund_btcusd (date, btcusd) VALUES (?, ?)", [date, btcusd], function() {
						db.query("UPDATE fund_btcusd SET btcusd=? WHERE date=?", [btcusd, date], function() {
							cb();
						})
					})
				} else {
					cb();
				}
			}, function() {
				console.log("Updated BTCUSD history.");
			})
		});
	}, 500 * 1000); // every 500 seconds

	var client = new bitcoin.Client({
	  host: 'localhost',
	  port: 8332,
	  user: 'bitcoinrpc',
	  pass: process.env.BTCRPCPASS,
	  timeout: 30000
	});

	setInterval(function() {
		client.listTransactions("quibs", 100000, 0, true, function(err, txlist) {
			if (err) {
				console.log(err)
				return;
			}

			var fund = {};

			db.query("SELECT txid FROM fund", [], function(err, results) {
				if (err) {
					console.log(err);
					return;
				}

				results.forEach(function(row) {
					fund[row.txid] = true;
				})

				var txids = {};

				async.mapSeries(txlist, function(tx, cb) {
					if (fund[tx.txid] == undefined) {
						txids[tx.txid] = {time: tx.time, amt: 0, fee: 0};
					} else {
						return cb();
					}

					txids[tx.txid].amt += tx.amount;
					if (tx.fee) {
						txids[tx.txid].fee = tx.fee;
					}
					cb();
				}, function() {
					async.mapSeries(Object.keys(txids), function(txid, cb) {
						var tx = txids[txid];
						var amount = (tx.amt + tx.fee) * Math.pow(10, 8);
						db.query("INSERT INTO fund (date, btc, txid) values (?, ?, ?)", [tx.time, amount, txid], function() {
							if (err) {
								console.log(err);
								return;
							}
							cb();
						})
					}, function() {
						if (Object.keys(txids).length > 0) {
							io.sockets.emit('chaching');
						}
					})
				})
			})
		})
	}, 5 * 1000) // every 5 seconds
}
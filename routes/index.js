/*
 * GET home page.
 */

exports.index = function(req, res) {
  res.render('index', {title:'It hurts when I pee.'});
};

exports.fund = function(req, res) {
  res.render('fund', {title:'Fund'});
};
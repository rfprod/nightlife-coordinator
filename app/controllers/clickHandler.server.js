'use strict';
var Usrs = require('../models/users.js');
function ClickHandler () {
	this.getClicks = function (req, res) {
		Usrs.findOne({ 'github.id': req.user.github.id }, { '_id': false })
			.exec(function (err, result) {
				if (err) { throw err; }
				res.send(result.rsvp);
			});
	};
	this.addClick = function (req, res) { // this handler is vacant
		/*
		Usrs.findOne({ 'github.id': req.user.github.id }, { '_id': false })
			.exec(function (err, result) {
				if (err) { throw err; }
				res.json(result.rsvp);
			});
		*/
	};
	this.resetClicks = function (req, res) { // this handler is vacant
		/*
		Usrs.findOne({ 'github.id': req.user.github.id }, { '_id': false })
			.exec(function (err, result) {
				if (err) { throw err; }
				res.json(result.rsvp);
			})*/
	};
}
module.exports = ClickHandler;

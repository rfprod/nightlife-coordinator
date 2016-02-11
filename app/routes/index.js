'use strict';

var path = process.cwd();
var ClickHandler = require(path + '/app/controllers/clickHandler.server.js');
var clickHandler = new ClickHandler();

var Usrs = require('../models/users.js');

var https = require("https");

module.exports = function (app, passport, jsdom, fs) {
	
	var jquerySource = fs.readFileSync(path + "/public/js/jquery.min.js", "utf-8");
	var serializeDocument = jsdom.serializeDocument;

	function isLoggedIn(req, res, next){
		if (req.isAuthenticated()) return next();
		else {
			if (req.url.indexOf('profile')){
				res.redirect('/login');
			}else{
				console.log(req.url.substring(req.url.indexOf('?'),req.url.length));
				res.redirect('/login'+req.url.substring(req.url.indexOf('?'),req.url.length));
			}
		}
	}
	function isLoggedInBool(req, res, next){
		if (req.isAuthenticated()) return true;
		else return false;
	}

	app.route('/').get(function (req, res) {
		Usrs.find({}, function(err, docs) {
		    if (err) throw err;
	        if (docs.length == 0) console.log('users do not exist: '+JSON.stringify(docs));
	        else console.log('users exist: '+JSON.stringify(docs));
		});
		var htmlNavAuthed = "<li class='nav-pills active'><a href='#app'><span class='glyphicon glyphicon-search'></span> Find Venues</a></li><li class='nav-pills'><a href='/profile'><span class='glyphicon glyphicon-user'></span> My Profile</a></li><li class='nav-pills'><a href='/logout'><span class='glyphicon glyphicon-remove'></span> Logout</a></li>";
		var htmlNavNotAuthed = "<li class='nav-pills active'><a href='/'><span class='glyphicon glyphicon-search'></span> Find Venues</a></li><li class='nav-pills'><a href='/login'><span class='glyphicon glyphicon-user'></span> Login with Github</a></li>";
		var htmlSourceIndex = null;
		var venueTemplate = null;
		fs.readFile(path + "/app/models/venue.html","utf-8", function(err,data){
			if (err) throw err;
			venueTemplate = data;
			fs.readFile(path + "/public/index.html", "utf-8", function (err,data) {
				if (err) throw err;
			  	htmlSourceIndex = data;
			  	jsdom.env({
					html: htmlSourceIndex,
					src: [jquerySource],
					done: function (err, window) {
						if (err) throw err;
						var $ = window.$;
						console.log("index page DOM successfully retrieved");
						if (isLoggedInBool(req, res)) $('.navbar-right').html(htmlNavAuthed);
						else $('.navbar-right').html(htmlNavNotAuthed);
						//$('.venues').append(venueTemplate);
						$('.venues').append('Input desired location in the form field above and hit <strong>Nightclubs</strong> button to the right of the input field.');
						var userVenues = "";
						
						if (isLoggedInBool(req, res)) {
							Usrs.findOne({ 'github.id': req.user.github.id }, function(err, docs) {
							    if (err) throw err;
							    userVenues = docs.rsvp.venueIDs;
								console.log('user RSVPs: '+JSON.stringify(userVenues));
								/*for (var i=0;i<venueIDs.length;i++){
					        		pollId = "poll-"+docs[i]._id;
					        		pollName = docs[i].displayName;
									$('.poll-heading').last().html(pollName);
									$('.poll-heading').last().attr('href','#'+pollId);
									$('.poll-internals').last().attr('id',pollId);
					        	}*/
								console.log("index page DOM manipulations complete");
								var newHtml = serializeDocument(window.document);
								res.send(newHtml);
								window.close();
							});
						}else{
							console.log("index page DOM manipulations complete");
							var newHtml = serializeDocument(window.document);
							res.send(newHtml);
							window.close();
						}
					}
				});
			});
		});
	});
	app.route('/login').get(function (req, res) {
		res.sendFile(path + '/public/login.html');
	});
	app.route('/logout').get(function (req, res) {
		req.logout();
		res.redirect('/login');
	});
	app.route('/profile').get(isLoggedIn, function (req, res) {
		var currentUserPass = req.session.passport.user;
		/*
		Usrs.find({}, function(err, docs) {
		    if (err) throw err;
	        if (docs.length == 0) console.log('users do not exist: '+JSON.stringify(docs));
	        else console.log('users exist: '+JSON.stringify(docs));
		});
		*/
		var htmlSourceProfile = null;
		var venueTemplate = null;
		fs.readFile(path + "/app/models/venue.html","utf-8", function(err,data){
			if (err) throw err;
			venueTemplate = data;
			fs.readFile(path + "/public/profile.html", "utf-8", function (err,data) {
				if (err) throw err;
			  	htmlSourceProfile = data;
				Usrs.findOne({ _id: currentUserPass }, function(err, docs) {
				    if (err) throw err;
				    var userVenues = docs.rsvp.venueIDs;
					console.log('user RSVPs: '+JSON.stringify(userVenues)+' | user venueIDs.length: '+userVenues.length);
					var venueId, foursquareVenueURL, venueName, venueLink, venueImgLink, venueTip;
					
					if (userVenues.length > 0){
						var counter = 0;
						(function getVenueDetails(){
			        		venueId = userVenues[counter];
			        		console.log(venueId);
			        		foursquareVenueURL = 'https://api.foursquare.com/v2/venues/'+venueId+'?client_id='+process.env.FOURSQUARE_KEY+'&client_secret='+process.env.FOURSQUARE_SECRET+'&v=20130815';
			        		https.get(foursquareVenueURL, (response) => {
								response.setEncoding('utf-8');
								var body = "";
							  	response.on('data', (chunk) => {body += chunk;});
							  	response.on('end', () => {
									var json = JSON.parse(body);
									if (json.response.venue){
										var venueDetails = json.response.venue;
										jsdom.env({
											html: htmlSourceProfile,
											src: [jquerySource],
											done: function (err, window) {
												if (err) throw err;
												var $ = window.$;
												console.log("index page DOM successfully retrieved");
												$('#profile-rsvps').html(userVenues.length);
												$('.venues').append(venueTemplate);
												venueLink = venueDetails.canonicalUrl;
												venueName = venueDetails.name;
												venueTip = venueDetails.location.formattedAddress.join();
												$('#item').attr('id','itm-'+counter);
												$('#itm-'+counter).find('#venue-image').addClass('hidden');
								        		$('#itm-'+counter).find('#link-venue-image').attr('href',venueLink);
								        		$('#itm-'+counter).find('#link-venue-heading').attr('href',venueLink);
												$('#itm-'+counter).find('#link-venue-heading').html(venueName);
												$('#itm-'+counter).find('.button-rsvp').addClass('hidden');
												$('#itm-'+counter).find('.button-rsvp-undo').removeClass('hidden');
												$('#itm-'+counter).find('.button-rsvp-undo').attr('id',venueId);
												$('#itm-'+counter).find('#venue-tip').html(venueTip);
												console.log('counter: '+counter+" | userVenues.length: "+userVenues.length);
												if (counter == userVenues.length-1){
													console.log("index page DOM manipulations complete");
													var newHtml = serializeDocument(window.document);
													console.log('newHtml is created');
													res.send(newHtml);
													window.close();
												}else{
													counter++;
													htmlSourceProfile = serializeDocument(window.document);
													//console.log(htmlSourceProfile);
													window.close();
													getVenueDetails();
												}
											}
										});
									}else res.send(json.meta.errorType+": "+json.meta.errorDetail);
							  	});
							}).on('error', (e) => {
							  	console.log(`Got error: ${e.message}`);
							}).on('close', () => {
								console.log('connection closed');
							});
						})();
					}else{
						jsdom.env({
							html: htmlSourceProfile,
							src: [jquerySource],
							done: function (err, window) {
								if (err) throw err;
								var $ = window.$;
								console.log("index page DOM successfully retrieved");
								$('#profile-rsvps').html(userVenues.length);
								$('.venues').append('You are not planning to attend any venues yet.');
								console.log("index page DOM manipulations complete");
								var newHtml = serializeDocument(window.document);
								res.send(newHtml);
								window.close();
							}
						});
					}
				});
			});
		});
	});
	function getPrm(url, prm) { // general puspose function for url params retrieval
	    // prm must not contain any regex characters
	    var pattern = new RegExp("[?&]" + prm + "=([^&]+)(&|$)");
	    var match = url.match(pattern);
	    return(match ? match[1] : "");
	}
	app.route('/rsvppost').get(isLoggedIn, function(req, res){
		var locationName = getPrm(req.url,'location');
		console.log('locationName: '+locationName);
		var venueId = getPrm(req.url,'venueId');
		console.log('venueId: '+venueId);
		Usrs.find({ 'github.id': req.user.github.id }, function(err,data){
			if (err) throw err;
			var userRSVPvenues = data[0].rsvp.venueIDs;
			console.log('userRSVPvenues: '+JSON.stringify(userRSVPvenues));
			if (userRSVPvenues.indexOf(venueId) == -1) {
				userRSVPvenues.push(venueId);
				Usrs.update({ 'github.id': req.user.github.id }, {$set:{'rsvp.venueIDs':userRSVPvenues}}, function(err,data){
			    	if (err) throw err;
			        console.log('updated user: '+JSON.stringify(data));
			        req.session.valid = true;
  					res.redirect('/profile');
			    });
			}
		});
	});
	app.route('/rsvpdelete').get(isLoggedIn, function(req, res){
		console.log('/rsvpdelete');
		var currentUserId = req.session.passport.user;
    	var venueId = getPrm(req.url,'venueId');
		console.log('venueId: '+venueId);
		Usrs.find({ 'github.id': req.user.github.id }, function(err,data){
			if (err) throw err;
			var userRSVPvenues = data[0].rsvp.venueIDs;
			var idIndex = userRSVPvenues.indexOf(venueId);
			console.log('userRSVPvenues: '+JSON.stringify(userRSVPvenues));
			console.log('idIndex: '+idIndex);
			if (userRSVPvenues.length > 1) userRSVPvenues = userRSVPvenues.splice(idIndex, 1);
			else userRSVPvenues = [];
			console.log('updated userRSVPvenues: '+JSON.stringify(userRSVPvenues));
			Usrs.update({ 'github.id': req.user.github.id }, {$set:{'rsvp.venueIDs':userRSVPvenues}}, function(err,data){
		    	if (err) throw err;
		        console.log('updated user: '+JSON.stringify(data));
		        req.session.valid = true;
		        
  				res.redirect('/profile'); // this does not redirect actually
		    });
		});
	});
	app.route('/api/:id').get(isLoggedIn, function(req, res){
		res.json(req.user.github);
	});
	app.route('/auth/github').get(passport.authenticate('github'));
	app.route('/auth/github/callback').get(passport.authenticate('github', {
		successRedirect: '/',
		failureRedirect: '/login'
	}));
	app.route('/api/:id/clicks')
		.get(isLoggedIn, clickHandler.getClicks)
		.post(isLoggedIn, clickHandler.addClick)
		.delete(isLoggedIn, clickHandler.resetClicks);
	
	app.route('/api/clicks/venues').get(function(req, res){
		var locationName = req.url.substring(req.url.indexOf('=')+1,req.url.length);
		var foursquareExploreURL = 'https://api.foursquare.com/v2/venues/explore?client_id='+process.env.FOURSQUARE_KEY+'&client_secret='+process.env.FOURSQUARE_SECRET+'&v=20130815&query=nightclub&near='+locationName;
		console.log('foursquareExploreURL: '+foursquareExploreURL);
		var foursquareAPIrequest = https.get(foursquareExploreURL, (response) => {
			response.setEncoding('utf-8');
			var body = "";
		  	response.on('data', (chunk) => {body += chunk;});
		  	response.on('end', () => {
		  		//res.json(JSON.parse(body));
		  		// venue id key: response -> groups -> items -> [i] -> venue -> id
				// venue name key: response -> groups -> items -> [i] -> venue -> name
				// venue address key: response -> groups -> items -> [i] -> venue -> location -> formattedAddress
				// venue text tip: response -> groups -> items -> [i] -> tips -> [0] -> text
				// venue canonical url: response -> groups -> items -> [i] -> tips -> [0] -> canonicalUrl
				// venue photo url: response -> groups -> items -> [i] -> tips -> [0] -> photourl
				var json = JSON.parse(body);
				//console.log(json);
				if (json.response.groups){
					var items = json.response.groups[0].items;
					console.log('items: '+JSON.stringify(items));
					var venueTemplate = null;
					fs.readFile(path + "/app/models/venue.html", "utf-8", function(err,data){
						if (err) throw err;
					  	venueTemplate = data;
					  	var venueId, venueName, venueAddress, venueLink, venueImgLink, venueTip;
					  	jsdom.env({
							html: "",
							src: [jquerySource],
							done: function (err, window) {
								if (err) throw err;
								var $ = window.$;
								console.log("index page DOM successfully retrieved");
								console.log('items.length: '+items.length);
								for (var i=0;i<items.length;i++){
									//$('body').append(venueTemplate);
									$('body').append(venueTemplate);
									$('.media').last().addClass('item-'+i);
									venueId = items[i].venue.id;
					        		venueName = items[i].venue.name;
					        		//venueAddress = items[i].venue.location.formattedAddress;
					        		venueLink = items[i].tips[0].canonicalUrl;
					        		venueImgLink = items[i].tips[0].photourl;
					        		venueTip = items[i].tips[0].text;
					        		$('.item-'+i).find('#venue-image').attr('src',venueImgLink);
					        		$('.item-'+i).find('#link-venue-image').attr('href',venueLink);
					        		$('.item-'+i).find('#link-venue-heading').attr('href',venueLink);
									$('.item-'+i).find('#link-venue-heading').html(venueName);
									$('.item-'+i).find('.button-rsvp').attr('id',i);
									$('.item-'+i).find('.button-rsvp').attr('href','/rsvppost?location='+locationName+'&venueId='+venueId);
									if (isLoggedInBool(req, res)) {
										$('.item-'+i).find('.button-rsvp-undo').removeClass('hidden');
										$('.item-'+i).find('.button-rsvp-undo').attr('href','/rsvpdelete?location='+locationName+'&venueId'+venueId);
									}
									$('.item-'+i).find('#venue-tip').last().html(venueTip);
								}
								console.log("index page DOM manipulations complete");
								var newHtml = serializeDocument(window.document);
								res.send(newHtml);
								window.close();
							}
						});
					});
				}else{
					res.send(json.meta.errorType+": "+json.meta.errorDetail);
					//res.send('There was an error getting data from Foursquare AIP. Try again, please.');
				}
		  		//res.json(JSON.parse(body));
		  	});
		}).on('error', (e) => {
      		console.log(`Got error: ${e.message}`);
		});
		foursquareAPIrequest.end();
	});
};
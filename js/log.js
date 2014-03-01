// Incident object definition.
function Incident(incidentData) {
	this.ID = incidentData.incident_number;
	this.Address = incidentData.address;
	this.Category = incidentData.type;
	this.DateLogged = incidentData.datetime ;
	this.Lat = incidentData.report_location.latitude;
	this.Lng = incidentData.report_location.longitude;
	this.Highlight = true;
};

// Incident Manager.

// Data storage.
var Storage = {
	Set: function (key, value) {
			localStorage.setItem(key, JSON.stringify(value));
		},
	Get: function (key) {
		if (localStorage.getItem(key) === null) {
			this.Set(key, []);
		}

		return JSON.parse(localStorage.getItem(key));
	}
};


var log = { 
	Config: {
		SecondsTillRefresh: 300,
		BaseUri: 'https://data.seattle.gov/resource/kzjm-xkqj.json',
		IncidentsKey: 'incidents'
	},
	RefreshData: function(newest) {
		var dataSource = log.GetDataSource(newest);
		var spinner = $('#spinner');
		var pane = $('#log-pane');

		$.ajax({
			type : "GET",
			dataType : "JSON",
			url : dataSource,
			timeout: 10000,
			beforeSend: function () {
				spinner.text('Fetching data...');

				// Center the spinner.
				var width = $(window).width();
    			var height = $(window).height();

				spinner.css({
		        	top: ((height / 2) - 25),
		        	left: ((width / 2) - 50)
		    	}).fadeIn(200);

				// Only dim pane if it is visible
				if (pane.is(":visible") === true) {
					pane.fadeTo('fast', 0.5);
				}
			},
			success: function(result) {	
				var incidents = Storage.Get(log.Config.IncidentsKey);

				for (var o = 0; o < incidents.length; o++) {
					// Toggle all existing incident Highlight flags to false.
					incidents[o].Highlight = false;
				}

				// Process the result.
				$.each( result, function( i, incidentData ) {
					var thisIncident = new Incident(incidentData);

					// Only push if there is not an object in the array with a matching IncidentID.
					if (!isIncidentLogged(thisIncident))
					{
						incidents.push(thisIncident);
					}
				});

				// Order array chronologically and put back into localStorage.
				Storage.Set(log.Config.IncidentsKey, log.SortData(incidents));

				// Reset timer if not returning historical data and new data was found.
				if (newest && result.length > 0 || log.Config.SecondsTillRefresh < 1) {
					log.Config.SecondsTillRefresh = 300;
				}
			},
			error: function(xhr, status, error) {
				spinner.text('Error retrieving data.');
				console.log(status + ': ' + error);
			}
		}).complete(function(){
			// Refresh data right away but leave message up for 1 additional second so user can read response text.
			log.RefreshTable();
			setTimeout(function(){
				spinner.fadeOut(200);
				pane.fadeTo('fast', 1.0);
			},1000);
	    });
	}, 
	SortData: function(data) {
		// Reference: http://www.stoimen.com/blog/2010/07/09/friday-algorithms-javascript-bubble-sort/

		if (data.length > 0 || data != undefined) {
			var swapped;
			do {
				swapped = false;

				for (var i = 0; i < data.length - 1; i++) {
					if (data[i].DateLogged < data[i + 1].DateLogged) {
						var temp = data[i];
						data[i] = data[i+1];
						data[i+1] = temp;
						swapped = true;
					}
				}

			} while (swapped);
		}

		return data;
	},
	SortCategories: function(categories, alphabetically) {
		if (alphabetically) {
			return categories.sort();
		}
		else {
			// Reference... bro: http://davidwalsh.name/array-sort
			return categories.sort(function(a, b) {
				return b.count - a.count;
			});
		}
	},
	RefreshTable: function () {
		var tableData = [];
		//incidents = getIncidents();
		incidents = Storage.Get(this.Config.IncidentsKey);

		for (var i = 0; i < incidents.length; i++) {
			var thisIncident = incidents[i];
			var cssClass;

			if (thisIncident.Highlight == true) {
				cssClass = ' class="incident-row highlight"';
			} else {
				cssClass = ' class="incident-row"';
			}

			tableData.push('<tr data-toggle="modal" data-target="#incident-modal" id="' + thisIncident.ID + '""' + cssClass + '><td>' + thisIncident.ID + '</td><td>' + thisIncident.Category + '</td><td>' + thisIncident.Address + '</td><td>' + getUserFriendlyDateTime(thisIncident.DateLogged) + '</td></tr>');
		}

		$('#row-count').text('Incidents: ' + tableData.length);

		//First remove existing rows.
		$("#log").find('tr:gt(0)').remove();

		//Next append new data.
		$("#log").append(tableData.join(''));

		log.RefreshSummary();
	},
	RefreshSummary: function() {
		var categories = [], i;
		var data = Storage.Get(this.Config.IncidentsKey);

		// Display the time range represented by the current dataset.
		var incidentRange = $('#incident-range');
		var newest = data[0];
		var oldest = data[data.length - 1];

		incidentRange.text(getUserFriendlyDateTime(newest.DateLogged) + ' - ' + getUserFriendlyDateTime(oldest.DateLogged));

		// Get a distinct list of categories from the current dataset.
		for (i = 0; i < data.length; i++) {
			var found = false;
			for (var c = 0; c < categories.length; c++) {
				if (categories[c].name == data[i].Category) {
					found = true;
				}
			}

			if (found == false) {
				category = { name: data[i].Category, count: getIncidentCountByCategory(data[i].Category)};
				categories.push(category);
			}
		}

		if (categories.length > 0) {
			// Sort the categories alphabetically.
			categories = log.SortCategories(categories, false)

			var htmlList = '<h1>Categories</h1><ul>';

			for (i = 0; i < categories.length; i++) {
				htmlList = htmlList + '<li>' + categories[i].name + '<span class=\'count\'>' + categories[i].count + '</span></li>';
			}

			htmlList = htmlList + '</ul>';

			$('#incident-type-summary').html(htmlList);
		}
	},
	GetIncident: function(incidentId) {
		var incidents = Storage.Get(this.Config.IncidentsKey);

		if (incidents.length > 0) {
			for (var i = 0; i < incidents.length; i++) {
				if (incidents[i].ID == incidentId) {
					return incidents[i];
				}
			}
		}
		
		return null;
	}, 
	GetMap: function(lat, lng, incidentId) {
		var incidentLatLng = new google.maps.LatLng(lat,lng);

		var mapOptions = {
		  center: incidentLatLng,
		  zoom: 16
		};

		window.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

		// Add Marker.
		var marker = new google.maps.Marker({
		    position: incidentLatLng,
		    animation: google.maps.Animation.DROP,
		    map: map,
		    title:("#" + incidentId)
		});

		// Add InfoWindow.
		marker.info = new google.maps.InfoWindow({
		  content: '<b>Incident:</b> ' + incidentId
		});

		google.maps.event.addListener(marker, 'click', function() {
		  marker.info.open(map, marker);
		});

		// Invert colors.
		// Reference: https://developers.google.com/maps/documentation/javascript/styling
		var styles = [
		  {
		    "stylers": [
	      		{ "invert_lightness": true }
	    	]
		  }
		];

		map.setOptions({styles: styles});
	},
	GetDataSource: function(newest) {
		var incidents = Storage.Get(this.Config.IncidentsKey);

		if (incidents.length === 0) {
			// Get current time in miliseconds since the epoch.
			var currentTime = new Date().getTime();
			// Convert to seconds.
			currentTime = (currentTime / 1000);
			// Subtract the number of seconds in 24 hours.
			currentTime = Math.floor(currentTime - (60 * 60 * 24));
			
			// Convert to ISO-8601 string.
			var dayAgo = new Date(currentTime * 1000).toISOString();
			return log.Config.BaseUri + "?$where=datetime>'" + dayAgo + '\'';
			
		}
		else
		{
			var incident, dateLogged;
			if (newest) {
				incident = getNewestIncident();
				dateLogged = new Date(incident.DateLogged * 1000).toISOString();
				return log.Config.BaseUri + "?$where=datetime>'" + dateLogged + '\'';
			}
			else {
				incident = getOldestIncident();
				dateLogged = new Date(incident.DateLogged * 1000).toISOString();
				return log.Config.BaseUri + "?$where=datetime<'" + dateLogged + '\'&$limit=50&$order=datetime desc';
			}
		}
	}
};

// Checks to see if an incident already exists in the array matching on ID.
function isIncidentLogged(incident) {
	var incidents = Storage.Get(log.Config.IncidentsKey);
	for (var i = 0; i < incidents.length; i++)
	{
		if (incidents[i].ID == incident.ID)
		{
			// TODO: Should I compare to see if any of the properties have changed?
			return true;
		}
	}
	return false;
}

// Returns the most recently logged incident.
function getNewestIncident() {
	var newest, data = Storage.Get(log.Config.IncidentsKey), i;

	for (i = 0; i < data.length; i++)
	{
		if (newest === undefined) {
			newest = data[i];
		}

		if (newest.DateLogged < data[i].DateLogged) {
			newest = data[i];
		}
	}

	return newest;
}

// Returns the earliest logged incident.
function getOldestIncident() {
	var oldest, data = Storage.Get(log.Config.IncidentsKey), i;

	for (i = 0; i < data.length; i++) {
		if (oldest === undefined) {
			oldest = data[i];
		}

		if (oldest.DateLogged > data[i].DateLogged) {
			oldest = data[i];
		}
	}

	return oldest;
}

// Returns the number of incidents in a single category.
function getIncidentCountByCategory(category) {
	var count = 0, data = Storage.Get(log.Config.IncidentsKey), i;

	for (i = 0; i < data.length; i++) {
		if (data[i].Category == category) {
			count++;
		}
	}

	return count;
}

// Returns a user-friendly date/time string {00:00:00 XX MM/DD/YYYY}.
function getUserFriendlyDateTime(date) {
	var friendlyDate = new Date(date * 1000);
	return friendlyDate.toLocaleTimeString() + ' ' + friendlyDate.toLocaleDateString();
}
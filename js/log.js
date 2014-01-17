// Incident object definition.
function Incident(incidentData) {
	this.ID = incidentData.incident_number;
	this.Address = incidentData.address;
	this.Category = incidentData.type;
	this.DateLogged = incidentData.datetime ;
	this.Lat = incidentData.report_location.latitude;
	this.Lng = incidentData.report_location.longitude;
};

// Store all fetched incident objects in this global array.
window.incidents = [];

var log = { 
	SecondsTillRefresh: 300,
	BaseUri: 'https://data.seattle.gov/resource/kzjm-xkqj.json',
	RefreshData: function(newest) {
		var dataSource = log.GetDataSource(newest);
		var spinner = $('#spinner');

		$.ajax({
			type : "GET",
			dataType : "JSON",
			url : dataSource,
			timeout: 10000,
			beforeSend: function () {
				spinner.slideDown('slow');
			},
			success: function(result) {		
				// Process the result.
				$.each( result, function( i, incidentData ) {
					var thisIncident = new Incident(incidentData);

					// Only push if there is not an object in the array with a matching IncidentID.
					if (!isIncidentLogged(thisIncident))
					{
						window.incidents.push(thisIncident);
					}
				});

				// Order array chronologically.
				log.SortData(window.incidents);

				// Reset timer if not returning historical data and new data was found.
				if (newest && result.length > 0) {
					log.SecondsTillRefresh = 300;
				}
			},
			error: function(xhr, status, error) {
				spinner.text('Error retrieving data.');
			}
		}).complete(function(){
			spinner.slideUp('slow');
			log.RefreshTable();
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
	},
	RefreshTable: function () {
		var tableData = [];

		for (var i = 0; i < window.incidents.length; i++) {
			var thisIncident = window.incidents[i];
			tableData.push('<tr data-toggle="modal" data-target="#incident-modal" id="' + thisIncident.ID + '""><td>' + thisIncident.ID + '</td><td>' + thisIncident.Category + '</td><td>' + thisIncident.Address + '</td><td>' + new Date(thisIncident.DateLogged * 1000).toLocaleTimeString() + ' ' + new Date(thisIncident.DateLogged * 1000).toLocaleDateString() + '</td></tr>');
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
		var data = window.incidents;

		for (i = 0; i < data.length; i++) {
			if (categories.indexOf(data[i].Category) < 0) {
				categories.push(data[i].Category);
			}
		}

		if (categories.length > 0) {
			categories.sort();

			var htmlList = '<h1>Categories</h1><ul>';

			for (i = 0; i < categories.length; i++) {
				htmlList = htmlList + '<li>' + categories[i] + '<span class=\'count\'>' + getIncidentCountByCategory(categories[i]) + '</span></li>';
			}

			htmlList = htmlList + '</ul>';

			$('#incident-type-summary').html(htmlList);
		}
	},
	GetIncident: function(incidentId) {
		if (window.incidents.length > 0) {
			for (var i = 0; i < window.incidents.length; i++) {
				if (window.incidents[i].ID == incidentId) {
					return incidents[i];
				}
			}
		}
		else {
			//TODO: Get JSON for a single incident.
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
		if (window.incidents.length === 0) {
			// Get current time in miliseconds since the epoch.
			var currentTime = new Date().getTime();
			// Convert to seconds.
			currentTime = (currentTime / 1000);
			// Subtract the number of seconds in 24 hours.
			currentTime = Math.floor(currentTime - (60 * 60 * 24));
			
			// Convert to ISO-8601 string.
			var dayAgo = new Date(currentTime * 1000).toISOString();
			return log.BaseUri + "?$where=datetime>'" + dayAgo + '\'';
			
		}
		else
		{
			var incident, dateLogged;
			if (newest) {
				incident = getNewestIncident();
				dateLogged = new Date(incident.DateLogged * 1000).toISOString();
				return log.BaseUri + "?$where=datetime>'" + dateLogged + '\'';
			}
			else {
				incident = getOldestIncident();
				dateLogged = new Date(incident.DateLogged * 1000).toISOString();
				return log.BaseUri + "?$where=datetime<'" + dateLogged + '\'&$limit=50&$order=datetime desc';
			}
		}
	}
};

// Checks to see if an incident already exists in the array matching on ID.
function isIncidentLogged(incident) {
	for (var i = 0; i < window.incidents.length; i++)
	{
		if (window.incidents[i].ID == incident.ID)
		{
			// TODO: Should I compare to see if any of the properties have changed?
			return true;
		}
	}
	return false;
}

// Returns the most recently logged incident.
function getNewestIncident() {
	var newestIncident, data = window.incidents, i;

	for (i = 0; i < data.length; i++)
	{
		if (newestIncident === undefined) {
			newestIncident = data[i];
		}

		if (newestIncident.DateLogged < data[i].DateLogged) {
			newestIncident = data[i];
		}
	}

	return newestIncident;
}

// Returns the earliest logged incident.
function getOldestIncident() {
	var oldestIncident, data = window.incidents, i;

	for (i = 0; i < data.length; i++) {
		if (oldestIncident === undefined) {
			oldestIncident = data[i];
		}

		if (oldestIncident.DateLogged > data[i].DateLogged) {
			oldestIncident = data[i];
		}
	}

	return oldestIncident;
}

// Returns the number of incidents in a single category.
function getIncidentCountByCategory(category) {
	var count = 0, data = window.incidents, i;

	for (i = 0; i < data.length; i++) {
		if (data[i].Category == category) {
			count++;
		}
	}

	return count;
}


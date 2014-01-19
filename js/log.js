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
//window.incidents = [];

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
				spinner.text('Fetching latest data...');
				spinner.slideDown('slow');
			},
			success: function(result) {	
				var incidents = getIncidents();

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
				setIncidents(log.SortData(incidents));

				// Reset timer if not returning historical data and new data was found.
				if (newest && result.length > 0 || log.SecondsTillRefresh < 1) {
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
		incidents = getIncidents();

		for (var i = 0; i < incidents.length; i++) {
			var thisIncident = incidents[i];
			tableData.push('<tr data-toggle="modal" data-target="#incident-modal" id="' + thisIncident.ID + '""><td>' + thisIncident.ID + '</td><td>' + thisIncident.Category + '</td><td>' + thisIncident.Address + '</td><td>' + getUserFriendlyDateTime(thisIncident.DateLogged) + '</td></tr>');
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
		var data = getIncidents();

		// Display the time range represented by the current dataset.
		var incidentRange = $('#incident-range');
		var newestIncident = data[0];
		var oldestIncident = data[data.length - 1];

		incidentRange.text(getUserFriendlyDateTime(newestIncident.DateLogged) + ' - ' + getUserFriendlyDateTime(oldestIncident.DateLogged));

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
		var incidents = getIncidents();

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
		var incidents = getIncidents();

		if (incidents.length === 0) {
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
	var incidents = getIncidents();
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
	var newestIncident, data = getIncidents(), i;

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
	var oldestIncident, data = getIncidents(), i;

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
	var count = 0, data = getIncidents(), i;

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

function setIncidents(incidents) {
	localStorage.setItem('incidents', JSON.stringify(incidents));
}

function getIncidents(incidents) {
	if (localStorage.getItem('incidents') === null) {
		setIncidents([]);
	}

	return JSON.parse(localStorage.getItem('incidents'));
}


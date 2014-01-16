// Incident object definition.
function Incident(incidentData) {
	this.ID = incidentData.incident_number;
	this.Address = incidentData.address;
	this.Category = incidentData.type;
	this.DateLogged = new Date(incidentData.datetime * 1000);
	this.Lat = incidentData.report_location.latitude;
	this.Lng = incidentData.report_location.longitude;
};

// Store all fetched incident objects in this global array.
window.incidents = [];

var log = { 
	LastRefresh: undefined,
	RefreshData: function() {
		var dataSource = log.GetDataSource();
		var spinner = $('#spinner');

		$.ajax({
			type : "GET",
			dataType : "JSON",
			url : dataSource,
			timeout: 10000,
			beforeSend: function () {
				spinner.slideDown('slow');
				console.log('Datasource: ' + dataSource);
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

				console.log('New rows: ' + result.length);

				// Order array chronologically.
				log.SortData(window.incidents);

				// Only update LastRefresh if new data was found otherwise retain the existing timestamp.
				if (result.length > 0) {
					var logged = new Date();
					log.LastRefresh = logged.toISOString();
				}
			},
			error: function(xhr, status, error) {
				spinner.text('Error retrieving data.');
			  	console.log(error);
			}
		}).complete(function(){
			spinner.slideUp('slow');
			log.RefreshTable();
			// Refresh feed every 5 minutes.
			// TODO: Make sure only 1 refresh timer is running at a time.  I believe this is currently adding a new timer with every complete.
	        setTimeout(function(){log.RefreshData();}, 300000);
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
			tableData.push('<tr data-toggle="modal" data-target="#incident-modal" id="' + thisIncident.ID + '""><td>' + thisIncident.ID + '</td><td>' + thisIncident.Category + '</td><td>' + thisIncident.Address + '</td><td>' + thisIncident.DateLogged.toLocaleTimeString() + ' ' + thisIncident.DateLogged.toLocaleDateString() + '</td></tr>');
		}

		console.log('Total rows: ' + tableData.length);

		//First remove existing rows.
		$("#log").find('tr:gt(0)').remove();

		//Next append new data.
		$("#log").append(tableData.join(''));
	},
	GetIncident: function(incidentId) {
		if (window.incidents.length > 0) {
			//TODO: see if incident exists in array.
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
	GetDataSource: function() {
		if (log.LastRefresh === undefined) {
			// Get current time in miliseconds since the epoch.
			var currentTime = new Date().getTime();
			// Convert to seconds.
			currentTime = (currentTime / 1000);
			// Subtract the number of seconds in 24 hours.
			currentTime = Math.floor(currentTime - (60 * 60 * 24));
			
			// Convert back to date.
			var dayAgo = new Date(currentTime * 1000);
			// Convert to ISO-8601 string.
			dayAgo = dayAgo.toISOString();

			return "https://data.seattle.gov/resource/kzjm-xkqj.json?$where=datetime>'" + dayAgo + '\'';
			
		}
		else
		{
			return "https://data.seattle.gov/resource/kzjm-xkqj.json?$where=datetime>'" + log.LastRefresh + '\'';
		}
	}
};

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

$(document).ready(function(){
	log.RefreshData();
});

$("#refresh").on('click', function(event){
	event.preventDefault();
	log.RefreshData();
});

$('#incident-modal').on('show.bs.modal', function (event) {
  	var incidentRow = $(event.relatedTarget);
  	var incident = log.GetIncident(incidentRow.attr('id'));
  	var modalWindowTitle = $('#incident-modal-title');

  	log.GetMap(incident.Lat, incident.Lng, incident.ID);
  	modalWindowTitle.text(incident.ID + ": " + incident.Category + ", " + incident.Address);
});

$('#incident-modal').on('shown.bs.modal', function (event) {
	// Resize: http://stackoverflow.com/questions/11742839/showing-a-google-map-in-a-modal-created-with-twitter-bootstrap
	// Recenter: http://stackoverflow.com/a/10002547/1754037
	var incidentRow = $(event.relatedTarget);
  	var incident = log.GetIncident(incidentRow.attr('id'));
	var center = new google.maps.LatLng(incident.Lat, incident.Lng);

    google.maps.event.trigger(document.getElementById("map-canvas"), "resize");
    window.map.setCenter(center);
});
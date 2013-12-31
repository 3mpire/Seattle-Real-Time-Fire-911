// Incident object definition.
function Incident(incidentData) {
	this.ID = incidentData[14];
	this.Address = incidentData[8];
	this.Category = incidentData[9];
	this.DateLogged = new Date(incidentData[10] * 1000);
	this.Lat = incidentData[11];
	this.Lng = incidentData[12];
};

// Store all fetched incident objects in this global array.
window.incidents = [];

var log = { 
	RefreshData: function() {
		var dataSource = "http://data.seattle.gov/api/views/kzjm-xkqj/rows.json?jsonp=?&max_rows=100";
		var spinner = $('#spinner');

		$.ajax({
			type : "GET",
			dataType : "JSONP",
			url : dataSource,
			beforeSend: function () {
				spinner.slideDown('slow');
			},
			success: function(result) {								
				$.each( result.data, function( i, incidentData ) {
					var thisIncident = new Incident(incidentData);
					window.incidents.push(thisIncident);
				});
			},
			error: function(xhr, status, error) {
			  	console.log(JSON.parse(xhr.responseText));
			}
		}).complete(function(){
			spinner.slideUp('slow');
			log.RefreshTable();
			//Refresh feed every 5 minutes.
	        setTimeout(function(){log.RefreshData();}, 300000);
	    });
	}, 
	RefreshTable: function () {
		var tableData = [];

		for (var i = 0; i < window.incidents.length; i++) {
			var thisIncident = window.incidents[i];
			tableData.push('<tr data-toggle="modal" data-target="#incident-modal" id="' + thisIncident.ID + '""><td>' + thisIncident.ID + '</td><td>' + thisIncident.Category + '</td><td>' + thisIncident.Address + '</td><td>' + thisIncident.DateLogged.toLocaleTimeString() + ' ' + thisIncident.DateLogged.toLocaleDateString() + '</td></tr>');
		}

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
		// reference: https://developers.google.com/maps/documentation/javascript/styling
		var styles = [
		  {
		    "stylers": [
	      		{ "invert_lightness": true }
	    	]
		  }
		];

		map.setOptions({styles: styles});
	}
};

$(document).ready(function(){
	log.RefreshData();
});

$("#refresh").on('click', function(event){
	event.preventDefault();
	log.RefreshData();
});

$('#incident-modal').on('show.bs.modal', function (e) {
  	var incidentRow = $(e.relatedTarget);
  	var incident = log.GetIncident(incidentRow.attr('id'));
  	var modalWindowTitle = $('#incident-modal-title');

  	log.GetMap(incident.Lat, incident.Lng, incident.ID);
  	modalWindowTitle.text(incident.ID + ": " + incident.Category + ", " + incident.Address);
});

$('#incident-modal').on('shown.bs.modal', function (e) {
	//Resize: http://stackoverflow.com/questions/11742839/showing-a-google-map-in-a-modal-created-with-twitter-bootstrap
	//Recenter: http://stackoverflow.com/a/10002547/1754037
	var incidentRow = $(e.relatedTarget);
  	var incident = log.GetIncident(incidentRow.attr('id'));
	var center = new google.maps.LatLng(incident.Lat, incident.Lng);

    google.maps.event.trigger(document.getElementById("map-canvas"), "resize");
    window.map.setCenter(center);
});
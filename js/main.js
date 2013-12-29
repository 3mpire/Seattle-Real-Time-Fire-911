var log = { Refresh: function(){
	var dataSource = "http://data.seattle.gov/api/views/kzjm-xkqj/rows.json?jsonp=?&max_rows=100";
	var spinner = $('#spinner')

	$.ajax({
		type : "GET",
		dataType : "JSONP",
		url : dataSource,
		beforeSend: function () {
			spinner.slideDown('slow');
		},
		success: function(result) {
			var incidents = [];
			$.each( result.data, function( i, incident ) {
				// Incident ID 	[14]
				// Address		[8]
				// Type 		[9]
				// Datetime 	[10]
				// Lat 			[11]
				// Long 		[12]

				var incidentID = incident[14];
				var address = incident[8];
				var type = incident[9];
				var date = new Date(incident[10] * 1000);
				var lat = incident[11];
				var long = incident[12];

				//incidents.push('<tr><td>' + incidentID + '</td><td>' + type + '</td><td><a href="map.html?id=' + incidentID + '&lat=' + lat + '&long=' + long + '" title="lat: ' + lat + '; long: ' + long + '">' + address + '</a></td><td>' + date.toLocaleTimeString() + ' ' + date.toLocaleDateString() + '</td></tr>');
				incidents.push('<tr data-toggle="modal" data-target="#incident-modal" data-incidentid="' + incidentID + '" data-incident="' + incident + '" data-lat="' + lat + '" data-lng="' + long + '" ><td>' + incidentID + '</td><td>' + type + '</td><td>' + address + '</td><td>' + date.toLocaleTimeString() + ' ' + date.toLocaleDateString() + '</td></tr>');
			});

			//First remove existing rows.
			$("#log").find('tr:gt(0)').remove();

			//Next append new data.
			$("#log").append(incidents.join(''));
		},
		error: function(xhr, status, error) {
		  	console.log(JSON.parse(xhr.responseText));
		}
	}).complete(function(){
		spinner.slideUp('slow');
		//Refresh feed every 5 minutes.
        setTimeout(function(){log.Refresh();}, 300000);
    });
}, GetIncident: function(incidentId) {
	//TODO: Get JSON for a single incident.
}, GetMap: function(lat, lng, incidentId) {
	var incidentLatLng = new google.maps.LatLng(lat,lng);

	var mapOptions = {
	  center: incidentLatLng,
	  zoom: 16
	};

	window.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	// To add the marker to the map, use the 'map' property
	var marker = new google.maps.Marker({
	    position: incidentLatLng,
	    map: map,
	    title:("#" + incidentId)
	});
}
};

$(document).ready(function(){
	log.Refresh();
});

$("#refresh").on('click', function(event){
	event.preventDefault();
	log.Refresh();
});

$('#incident-modal').on('show.bs.modal', function (e) {
  	var incident = $(e.relatedTarget);
  	var incidentId = incident.data('incidentid');
  	var incidentLat = incident.data('lat');
  	var incidentLng = incident.data('lng');
  	var incidentData = incident.data('incident');
  	var modalWindowTitle = $('#incident-modal-title');
  	var modalWindowBody = $('#incident-modal-body');

  	log.GetMap(incidentLat, incidentLng, incidentId);

  	modalWindowTitle.text(incidentId);
  	modalWindowBody.html(incidentData);
});

$('#incident-modal').on('shown.bs.modal', function (e) {
	//Resize: http://stackoverflow.com/questions/11742839/showing-a-google-map-in-a-modal-created-with-twitter-bootstrap
	//Recenter: http://stackoverflow.com/a/10002547/1754037
	var incident = $(e.relatedTarget);
	var incidentLat = incident.data('lat');
  	var incidentLng = incident.data('lng');
	var center = new google.maps.LatLng(incidentLat, incidentLng);

    google.maps.event.trigger(document.getElementById("map-canvas"), "resize");
    window.map.panTo(center);
});
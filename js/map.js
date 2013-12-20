$(document).ready(function(){
	initialize();
});

function initialize() {
	var lat = getParameterByName("lat");
	var lng = getParameterByName("long");

	var incidentLatLng = new google.maps.LatLng(lat,lng);

	var mapOptions = {
	  center: incidentLatLng,
	  zoom: 16
	};

	var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

	// To add the marker to the map, use the 'map' property
	var marker = new google.maps.Marker({
	    position: incidentLatLng,
	    map: map,
	    title:("#" + getParameterByName("id"))
	});

	console.log(map);
}

// http://stackoverflow.com/a/901144/1754037
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
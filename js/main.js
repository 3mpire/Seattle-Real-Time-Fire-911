function refreshCountdown() {
	if (log.Config.SecondsTillRefresh > 0)
	{
		var timer = $('#refresh-timer');
		timer.text('Refresh in ' + log.Config.SecondsTillRefresh + ' seconds.');
		log.Config.SecondsTillRefresh--;
	}
	else
	{
		log.RefreshData(true);
	}
	setTimeout(refreshCountdown, 1000);
}

function removeHighlight() {
	setTimeout(function() {
		$('.highlight').removeClass('highlight', 1000);
	}, 5000);
}

$(document).ready(function(){
	log.RefreshData(true);
	setTimeout(refreshCountdown, 1000);
	removeHighlight();
});

$("#refresh").on('click', function(event){
	event.preventDefault();
	log.RefreshData(true);
	removeHighlight();
});

$('#more').on('click', function(event) {
	log.RefreshData(false);
	removeHighlight();
})

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
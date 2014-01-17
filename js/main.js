function refreshCountdown() {
	if (log.SecondsTillRefresh > 0)
	{
		var timer = $('#refresh-timer');
		timer.text('Refresh in ' + log.SecondsTillRefresh + ' seconds.');
		log.SecondsTillRefresh--;
	}
	else
	{
		log.RefreshData(true);
	}

	setTimeout(refreshCountdown, 1000);
}

$(document).ready(function(){
	log.RefreshData();
	setTimeout(refreshCountdown, 1000);
});

$("#refresh").on('click', function(event){
	event.preventDefault();
	log.RefreshData(true);
});

$('#more').on('click', function(event) {
	log.RefreshData(false);
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
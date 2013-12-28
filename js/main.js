var log = { Refresh: function(){
	var dataSource = "http://data.seattle.gov/api/views/kzjm-xkqj/rows.json?jsonp=?&max_rows=100";
	console.log('refreshing...');

	$.ajax({
		type : "GET",
		dataType : "JSONP",
		url : dataSource,
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

				incidents.push('<tr><td>' + incidentID + '</td><td>' + type + '</td><td><a href="map.html?id=' + incidentID + '&lat=' + lat + '&long=' + long + '">' + address + '</a></td><td>' + date.toLocaleTimeString() + ' ' + date.toLocaleDateString() + '</td></tr>');
			});

			$("#log").append(incidents.join(''));
		},
		error: function(xhr, status, error) {
		  	console.log(JSON.parse(xhr.responseText));
		}
	}).complete(function(){
		//Refresh feed every 5 minutes.
        setTimeout(function(){log.Refresh();}, 300000);
    });
} };

$(document).ready(function(){
	log.Refresh();
});
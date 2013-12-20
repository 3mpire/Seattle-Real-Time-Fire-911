$(document).ready(function(){
	var dataSource = "http://data.seattle.gov/api/views/kzjm-xkqj/rows.json?jsonp=?&max_rows=100";

	$.ajax({
		type : "GET",
		dataType : "JSONP",
		url : dataSource,
		success: function(result) {
			console.log(result.data);

			var incidents = [];
			$.each( result.data, function( i, incident ) {
				console.log(incident);

				// Incident ID 	[14]
				// Address		[8]
				// Type 		[9]
				// Datetime 	[10]
				// Lat 			[11]
				// Long 		[12]

				var indicentID = incident[14];
				var address = incident[8];
				var type = incident[9];
				var date = new Date(incident[10] * 1000);
				var lat = incident[11];
				var long = incident[12];

				incidents.push('<tr><td>' + indicentID + '</td><td>' + type + '</td><td>' + address + '</td><td>' + date.toLocaleTimeString() + ' ' + date.toLocaleDateString() + '</td><td>' + lat + '</td><td>' + long + '</td></tr>');
			});

			$("#log").append(incidents.join(''));
		},
		error: function(xhr, status, error) {
		  	console.log(JSON.parse(xhr.responseText));
		}
	});
});
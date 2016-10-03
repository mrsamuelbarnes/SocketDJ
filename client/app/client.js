// Declare the YouTube API key
var apiKey = "AIzaSyCxE5UsxJCMUKdZ-fX5vgsUMcvQWzzcjck";

function changeView(viewName, viewValues) {

  // Get the view path
  var viewPath = 'app/views/' + viewName + '.htm';

  // Retrive the view
  $.ajax({
      url : viewPath,
      values : viewValues,
      success : function(view){

          // Apply the view
          $('#app').html(view);

					// Apply the view values
					mapValues(this.values);
      }
  });
}

function mapValues(viewValues){

	// Loop through the view values
	for (var key in viewValues) {

		// Ignore a value if it doesn't have a key
		if (viewValues.hasOwnProperty(key)) {

			// Deduce the type of key
			switch(key.charAt(0)) {

				case '#':
					// The value is referring to an id
					$(key).html(viewValues[key]);
					break;

				case '.':
					// The value is referring to a class
					$(key).each( function() {

						// Apply the value to each instance
						$(this).html(viewValues[key])
					});
					break;

				default:
					// TODO handle others
					alert('Binding not yet supported, sorry.')
			}
		}
	}
}

function joinRoom() {

  // Get the entered room id
  var roomId = $('#roomId').val();

  // Attempt to join the room with that id
  socket.emit('joinRoom', roomId);
}

function createRoom() {

  // Tell the server to initalise a new room
  socket.emit('createRoom');
}

function notification(notificationHtml) {

  // Display the notification
  $('#notification-overlay').html(notificationHtml);
  $("#notification-overlay").fadeIn();

  // Remove the notification after 2.5 seconds
  setTimeout(function(){
    $("#notification-overlay").fadeOut(function(){
      $('#notification-overlay').html('');
    })
  }, 2500);
}

function addTrack(videoId) {

  // Tell the server to add a track to the playlist
  socket.emit('addTrack', videoId);

  // Update the voting table for the room
  var roomId = $('.roomId').text();
  socket.emit('updateVotes', roomId);
}

function voteUp(videoId) {

  // Get the room id
  var roomId = $('.roomId').text();

  // Tell the server to vote this track up in the room
  socket.emit('voteUp', roomId, videoId);

  // Update the voting table for the room
  socket.emit('updateVotes', roomId);
}

function requestNextTrack() {

  // Tell the server that the next track is needed
  socket.emit('requestNextTrack');
}

function search(event) {

  // Check if the enter key was pressed
  if(event.code == "Enter"){

    // Build the search query
    var searchQuery = $('#search').val();
    var searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=' + searchQuery + '&key=' + apiKey;

    $.ajax({
        url : searchUrl,
        success : function(data){

            // Clear previous search results
            $('#search-results').html('');

            // Loop through each search result
            data.items.forEach( function(result){

							$('#search-results').append('<div class="row search-result" onclick="addTrack(\'' + result.id.videoId + '\');">' +
																						'<div class="col-sm-3">' +
																							'<img class="search-result-thumbnail"' +
																							' src="' + result.snippet.thumbnails.high.url + '" />' +
																						'</div>' +
																						'<div class="col-sm-9">' +
																							'<h3>' + result.snippet.title + '</h3>' +
																							'<span>' + result.snippet.channelTitle + '</span>' +
																						'</div>' +
																					'</div>');
						});
        }
    });
  } else {

    // Enter not pressed
  }
}

// Connect to a socket
var socket = io.connect();

// Load the starting view
changeView('start');

// Handle the socket events
socket.on('changeView', function(viewName, viewValues) {

  // Change the view
  changeView(viewName, viewValues);
});

socket.on('updateValues', function(values) {

  // Change the view
  mapValues(values);
});

socket.on('notification', function(type, message) {

  // Deduce the notification type and display
  switch(type) {
    case 'info':
      notification('<div class="notification alert alert-info" role="alert">' + message + '</div>');
      break;

    case 'success':
      notification('<div class="notification alert alert-success" role="alert">' + message + '</div>');
      break;

    case 'warning':
      notification('<div class="notification alert alert-warning" role="alert">' + message + '</div>');
      break;

    case 'error':
      notification('<div class="notification alert alert-danger" role="alert">' + message + '</div>');
      break;

    default:
      // Invalid type given
  }
});

socket.on('trackAdded', function(roomData) {

  // Check if there is a song currently playing and tracks waiting
  if(roomData.nowPlaying != null && roomData.playlist.length > 1) {

    // Update the voting table for the room
    var roomId = $('.roomId').text()
    socket.emit('updateVotes', roomId);

  } else if (roomData.nowPlaying == null && roomData.playlist.length == 1) {

    // There was no track playing and no tracks waiting, load the track
    player.cueVideoById(roomData.playlist[0].id);

    // Update the now playing and empty the playlist
    socket.emit('updateRoom', { 'name': roomData.name,
                                'nowPlaying': roomData.playlist[0],
                                'playlist': []
                              });

    // Update the voting table for the room
    var roomId = $('.roomId').text()
    socket.emit('updateVotes', roomId);
  }
});

socket.on('queueTrack', function(track) {

  // Load the track
  player.cueVideoById(track.id);
});

socket.on('updateVotes', function(playlist) {

  // Loop through each item in the playlist
  trackIds = ""
  playlist.forEach(function (track){

    // Check if this is the first track
    if(trackIds == ""){

      // Add the track id
      trackIds += track.id;
    } else {

      // Append the track id
      trackIds += ',' + track.id;
    }

  });

  // Request the video details
  var url = "https://www.googleapis.com/youtube/v3/videos?id=" + trackIds + "&key=" + apiKey + "&part=snippet";
  $.ajax({
      url : url,
      success : function(trackDetails){

        // Initalise the detailed playlist
        var detailedPlaylist = [];

        // Loop through the tracks
        trackDetails.items.forEach( function(track, index) {

          // Add the detailed track object to the
          detailedPlaylist.push({ 'id': playlist[index].id,
                                  'title': track.snippet.title,
                                  'votes': playlist[index].votes});
        })

        // Sort the votes
        detailedPlaylist.sort(function(track1, track2) {
          if (track1.votes > track2.votes) {
            return -1;
          }
          if (track1.votes < track2.votes) {
            return 1;
          }
          // Votes are equal
          return 0;
        });

        // Clear the votes display
        $('#votes-display').html("");

        // Loop through the detailed playlist
        detailedPlaylist.forEach( function (track) {

          // Add the track to the votes display
          $('#votes-display').append('<h3>' + track.title + ' <small>Votes: ' +
                                      track.votes + '</small>' +
                                      '<span onclick="voteUp(\'' + track.id.trim() +
                                      '\')" class="glyphicon glyphicon-arrow-up float-right"></span></h3>');
        })
      }
  });

});

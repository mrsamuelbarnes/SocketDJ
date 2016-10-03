// Node modules
var express = require('express');
var socketio = require('socket.io');

// Server modules
var config = require('./server/config');
var logger = require('./server/logger');
var data = require('./server/data');

// Create the server
var app = express();
var server = app.listen(config.port, function() {
  logger.log('\n' + config.appName + ' started on ' +
                    config.hostName + ':' + config.port);
});
var io = socketio.listen(server);

// Specify root external directory
app.use(express.static(__dirname + '/client'));

// Configure routing
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/client/index.htm');
});

// Initalise global variables
var connectedUsers = 0;
var roomData = {};
var userData = {};

// Handle socket connections
io.sockets.on('connection', function(socket){

  // Add the new user
  connectedUsers++;
	userData[socket.id] = { rooms: [] };
  logger.log('New connection from ' + socket.handshake.address, 'info');
  logger.log('There are currently ' + connectedUsers + ' connected users', 'info');

  // Handle the disconnect event
  socket.on('disconnect', function () {

    // Remove the user
    connectedUsers--;

		// Loop through each room the user was in
		userData[socket.id].rooms.forEach( function(roomId){

				// Check if the room still exists
				if(io.sockets.adapter.rooms[roomId]){

					// Update the mapped values for users in the room
					var roomPopulation = io.sockets.adapter.rooms[roomId].length;
					io.to(roomId).emit('updateValues', {'.population': roomPopulation});
				}
		});

		// Delete local user data
		delete userData[socket.id];
    logger.log('Disconnection from ' + socket.id, 'info');
    logger.log('There are currently ' + connectedUsers + ' connected users', 'info');
  });

  // Handle the socket events
  socket.on('createRoom', function() {

    // Keep generating until an unused id is found
    var roomId;
    var roomIdUsed = true;
    while(roomIdUsed){

      // Generate a room id
      roomId = data.generateRoomId();

      // Check if the room id is already in use
      if(roomData[roomId] == null){

        // The room id isn't in use, exit the loop
        roomIdUsed = false;
      } else {

        // The room id is in use, issue a warning
        logger.log(socket.id + ' attempted to create a room with id "' + roomId + '"', 'warning');
      }
    }

    // Create the room with initial values
    roomData[roomId] = {
      'name': roomId,
      'bigScreen': socket.id,
      'nowPlaying': null,
      'playlist': []
    };

		// Join the room
    socket.join(roomId);
		userData[socket.id].rooms.push(roomId);
    logger.log(socket.id + ' created a new room with id "' + roomId + '"', 'info');

    // Tell the client to join their big-screen area
		var roomPopulation = io.sockets.adapter.rooms[roomId].length;
    socket.emit('changeView', 'big-screen', {'.roomId': roomId, '.population': roomPopulation});
  });

  socket.on('joinRoom', function(roomId) {

    // Check a room exists with the id
    if(roomData[roomId] == null){

      // The room doesn't exist
      logger.log(socket.id + " attempted to join non-existant room " + '"' + roomId + '"', 'warning');
      socket.emit('notification', "error", "Sorry, that room doesn't exist.");
    } else {

      // The room exists, join the room
      socket.join(roomId);
			userData[socket.id].rooms.push(roomId);
			var roomPopulation = io.sockets.adapter.rooms[roomId].length;
			io.to(roomId).emit('updateValues', {'.population': roomPopulation});

			// Change to the rooms current view
	    socket.emit('changeView', 'small-screen', {'.roomId': roomId, '.population': roomPopulation});
      logger.log(socket.id + ' joined room "' + roomId + '"', 'info');
    }
  });

  socket.on('updateRoom', function(roomUpdate) {

    // Loop through the values to update
    for (var key in roomUpdate) {

      // Update the values server side
      roomData[roomUpdate.name][key] = roomUpdate[key];
    }
  });

  socket.on('addTrack', function(videoId) {

    // Get the rooms the socket is in
    var rooms = userData[socket.id].rooms;

    // Loop through each room
    rooms.forEach( function(room) {

      // Add the track to the playlist
      logger.log(socket.id + ' added "' + videoId + '" to room "' + room + '"s playlist', 'info');
      roomData[room].playlist.push( { 'id': videoId, 'votes': 0  } );

      // Tell the big screen that a track has been added
      io.sockets.connected[roomData[room].bigScreen].emit('trackAdded', roomData[room]);
    });
  });

  socket.on('voteUp', function(roomId, videoId) {

    // Loop through each track in this room
    roomData[roomId].playlist.forEach(function (track, index) {

      // Check if this was the upvoted track
      if (track.id == videoId){

        // Increment the vote value for this track
        roomData[roomId].playlist[index].votes++;
      }
    });

    // Push the updated votes to the entire room
    io.to(roomId).emit('updateVotes', roomData[roomId].playlist);
  })

  socket.on('requestNextTrack', function() {

    // Get the rooms the socket is in
    var rooms = userData[socket.id].rooms;

    // Loop through each room
    rooms.forEach( function(room) {
      logger.log(socket.id + ' requested a new track for room "' + room + '"', 'info');

      // Get the playlist for this room
      var playlist = roomData[room].playlist;

      // Reverse the playlist to prioritise older suggestions
      playlist.reverse();

      // Loop through each track in the playlist from the most recently added
      var topTrack = { 'votes': -1};
      var topTackIndex;
      playlist.forEach( function(track, index) {

        // Check if the track has the highest votes so far
        if (track.votes >= topTrack.votes){

          // Make the track the new top track
          topTrack = track;
          topTackIndex = index;
        }
      });

      // Remove the highest voted track from the playlist
      roomData[room].playlist.splice(topTackIndex, 1);

      // Queue the highest voted track
      socket.emit('queueTrack', topTrack);
      logger.log('"' + topTrack.id + ' was queued for room "' + room + '"', 'info');
    });
  });

  socket.on('mapToRoom', function(roomId, values){

    // Push the mapping to the enitre room
    io.to(roomId).emit('updateValues', values);
  });

  socket.on('updateVotes', function(roomId) {

    // Push the updated votes to the entire room
    io.to(roomId).emit('updateVotes', roomData[roomId].playlist);
  })
});

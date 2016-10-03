(function() {

  var roomIdCharacters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
                          'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
                          's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0',
                          '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Room id generation function
  module.exports.generateRoomId = function() {
    var roomId = '';

    // Generate a 4 character alphanumeric id
    for(var index = 0; index < 4; index++){

      // Generate a random value from 0 to 35
      var randomValue = Math.round(Math.random() * 35);

      // Add a character to the room id
      roomId += roomIdCharacters[randomValue];
    }

    // Return the room id
    return roomId;
  };

}());

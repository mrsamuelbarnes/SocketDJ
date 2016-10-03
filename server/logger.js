var moment = require('moment');

(function() {

  // Logging function
  module.exports.log = function(message, type) {

    // Get the log time
    var logTime = moment().format('DD/MM/YYYY HH:mm:ss');

    // Deduce the message type
    switch(type) {
      case 'info':
        // Log the message
        console.log('[info    ' + logTime + '] - ' + message);
        break;

      case 'warning':
        // Log the warning
        console.log('[warning ' + logTime + '] - ' + message);
        break;

      case 'error':
        // Log the error
        console.log('[error   ' + logTime + '] - ' + message);
        break;

      default:
        // Log a generic message
        console.log(message);
    }
  }

}());

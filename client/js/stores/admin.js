// Usage:
//   var users = require('./stores/users');
//

var request = require('./lib/request');
var emitter = require('component-emitter');

// Init
emitter(exports);

// Public methods

exports.getUsers = function (callback) {
  // Fetch a users from server and return array of raw user objects.
  // The user objects will have email property but no hash property.
  // Will call back with error if not found.
  //
  // Parameters:
  //   callback
  //     function (err, users)
  //
  request.getJSON('/api/admin/users', callback);
};


exports.getUser = function (username, callback) {
  // Fetch one user with admin-only data.
  request.getJSON('/api/admin/users/' + username, callback);
};


exports.setRole = function (username, role, callback) {
  // Parameters:
  //   username
  //     string
  //   role
  //     string, either 'admin' or 'normal'
  //   callback
  //     function (err)
  //
  var normRole = role === 'admin' ? 'admin' : 'normal';

  request.postJSON({
    url: '/api/admin/users/' + username,
    data: {
      role: normRole,
    },
  }, callback);
};
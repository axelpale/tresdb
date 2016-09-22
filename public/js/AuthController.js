var Emitter = require('component-emitter');
var jwtDecode = require('jwt-decode');

var TOKEN_KEY = 'tresdb-session-token';

module.exports = function AuthController(socket, storage) {
  // Parameters:
  //   socket
  //   storage
  // Emits:
  //   login
  //   logout
  Emitter(this);
  var self = this;

  this.login = function (email, password, callback) {
    // Parameters:
    //   email
    //     email address
    //   password
    //   callback
    //     function (err)
    // Emits:
    //   login
    //     On successful login.
    var payload;

    if (typeof callback === 'undefined') { callback = function () {}; }

    payload = { email: email, password: password };
    socket.emit('auth/login', payload, function (response) {
      console.log('auth/login response');
      if (response.hasOwnProperty('token')) {
        // Success
        console.log('login successful');
        storage.setItem(TOKEN_KEY, response.token);
        // Publish within client
        self.emit('login');
        callback(null);
      } else if (response.hasOwnProperty('error')) {
        // Failure
        console.log('login failed, possibly invalid email or password');
        callback({
          name: response.error
        });
      } else {
        // Error
        console.error('Invalid response to loginRequest');
      }
    });
  };

  this.logout = function (callback) {
    // Parameters:
    //   callback
    //     function (err), if successful, err === null
    // Emits:
    //   logout
    //     On successful logout

    // TODO ask server to invalidate the token.

    storage.removeItem(TOKEN_KEY);
    self.emit('logout');

    if (typeof callback !== 'undefined') {
      callback(null);
    }
  };

  this.changePassword = function (currentPassword, newPassword, callback) {
    // Change user password. Requires token to be set.
    //
    // Parameters:
    //   currentPassword
    //     Server ensures that user knows the current password before
    //     changing.
    //   newPassword
    //   callback
    //     function (err). If success, err is null.

    // Data to send to server.
    var payload = {
      token: this.getToken(),
      currentPassword: currentPassword,
      newPassword: newPassword
    };

    console.log('Emitting auth/changePassword');

    // Ask server to change the password.
    socket.emit('auth/changePassword', payload, function (response) {
      console.log('auth/changePassword socket responsed:');
      console.log(response);
      if (response.hasOwnProperty('error')) {
        callback({
          name: response.error
        });
        return;
      }  // else
      if (response.hasOwnProperty('success')) {
        callback(null);
        return;
      }  // else
      console.error('Invalid response from auth/changePassword');
    });
  };

  this.sendResetPasswordEmail = function (email, callback) {

    // Data to send to server.
    var payload = {
      email: email
    };

    socket.emit('auth/sendResetPasswordEmail', payload, function (response) {
      console.log('auth/sendResetPasswordEmail socket responsed:');
      console.log(response);
      if (response.hasOwnProperty('error')) {
        callback({
          name: response.error
        });
        return;
      }  // else
      if (response.hasOwnProperty('success')) {
        callback(null);
        return;
      }  // else
      console.error('Invalid response from auth/sendResetPasswordEmail');
    });
  };

  this.resetPassword = function (token, newPassword, callback) {

    var payload = {
      token: token,
      password: newPassword
    };

    socket.emit('auth/resetPassword', payload, function (response) {
      console.log('auth/resetPassword socket responsed.');
      if (response.hasOwnProperty('error')) {
        callback({
          name: response.error
        });
        return;
      }  // else
      if (response.hasOwnProperty('success')) {
        callback(null);
        return;
      }  // else
      console.error('Invalid response from auth/resetPassword');
    });
  };

  this.sendInviteEmail = function (email, callback) {

    var payload = {
      token: this.getToken(),
      email: email
    };

    socket.emit('auth/sendInviteEmail', payload, function (response) {
      console.log('auth/sendInviteEmail socket responsed.');
      if (response.hasOwnProperty('error')) {
        console.log(response.error);
        callback({
          name: response.error
        });
        return;
      }  // else
      if (response.hasOwnProperty('success')) {
        callback(null);
        return;
      }  // else
      console.error('Invalid response from auth/sendInviteEmail');
    });
  };

  this.hasToken = function () {
    // True if user is authenticated.

    if (storage.getItem(TOKEN_KEY) !== null) {
      return true;
    }
    return false;
  };

  this.getToken = function () {
    // Can be called only if hasToken.
    if (!this.hasToken()) {
      throw new Error('The token is missing.');
    }
    return storage.getItem(TOKEN_KEY);
  };

  this.getPayload = function () {
    // Can be called only if hasToken.
    if (!this.hasToken()) {
      throw new Error('Cannot get payload because missing token.');
    }
    return jwtDecode(this.getToken());
  };
}

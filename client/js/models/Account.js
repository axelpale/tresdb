// Account
//
// Responsible:
// - authentication login
// - current user data
// - communication with the server
// - handling tokens in browser memory
//
// Not responsible:
// - validation of input values
//

var Emitter = require('component-emitter');
var jwtDecode = require('jwt-decode');

module.exports = function (api, storage) {
  // Parameters:
  //   api
  //     api.Api instance
  //   storage
  //
  // Emits:
  //   login
  //   logout

  Emitter(this);
  var self = this;

  var TOKEN_KEY = api.getTokenKey();

  this.login = function (email, password, callback) {
    // Parameters:
    //   email
    //     email address
    //   password
    //   callback
    //     function (err), optional
    // Emits:
    //   login
    //     On successful login.

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new Error('invalid parameters');
    }

    var payload = {
      email: email,
      password: password,
    };

    if (typeof callback !== 'function') {
      callback = function () {};
    }

    api.requestRaw('account/login', payload, function (err, token) {
      if (err) {
        return callback(err);
      }

      if (typeof token !== 'string') {
        throw new Error('invalid server response');
      }

      storage.setItem(TOKEN_KEY, token);

      // Publish within client
      self.emit('login');

      return callback(null);
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
      return callback(null);
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
      currentPassword: currentPassword,
      newPassword: newPassword,
    };

    api.request('account/changePassword', payload, callback);
  };

  this.sendResetPasswordEmail = function (email, callback) {

    // Data to send to server.
    var payload = {
      email: email,
    };

    api.requestRaw('account/sendResetPasswordEmail', payload, callback);
  };

  this.resetPassword = function (token, newPassword, callback) {

    var payload = {
      token: token,
      password: newPassword,
    };

    api.requestRaw('account/resetPassword', payload, callback);
  };

  this.sendInviteEmail = function (email, callback) {

    var payload = {
      email: email,
    };

    api.request('account/sendInviteEmail', payload, callback);
  };

  this.signup = function (token, username, password, callback) {
    // Parameters
    //   token
    //     The token user received in email. Contains email address
    //   username
    //   password
    //   callback

    var payload = {
      token: token,
      username: username,
      password: password,
    };

    api.requestRaw('account/signup', payload, callback);
  };

  this.isLoggedIn = function () {
    // True if user is authenticated.

    if (storage.getItem(TOKEN_KEY) !== null) {
      return true;
    }

    return false;
  };

  this.getToken = function () {
    // Can be called only if isLoggedIn.
    if (!this.isLoggedIn()) {
      throw new Error('The token is missing.');
    }

    return storage.getItem(TOKEN_KEY);
  };

  this.getUser = function () {
    // Get user object:
    // {
    //   name: <string>
    //   email: <string>
    //   admin: <bool>
    // }
    //
    // Can be called only if isLoggedIn.
    if (!this.isLoggedIn()) {
      throw new Error('Cannot get payload because missing token.');
    }

    return jwtDecode(storage.getItem(TOKEN_KEY));
  };

  this.getName = function () {
    // Return username as a string
    return this.getUser().name;
  };
};
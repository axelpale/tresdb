// This is the form the user arrives via the link in a password reset email.

var account = require('../../stores/account');
var template = require('./template.ejs');
var emitter = require('component-emitter');
var jwtDecode = require('jwt-decode');

module.exports = function (token, showLogin) {
  // Parameters
  //   token
  //     string
  //   showLogin
  //     function ()

  // Init
  emitter(this);

  var parsedToken = jwtDecode(token);
  // Note: server will check if token still fresh. No need to check it here
  // and duplicate the information about duration.


  // Private method declaration

  var submitHandler;
  var responseHandler;


  // Public methods

  this.render = function () {
    return template({ email: parsedToken.email });
  };

  this.bind = function () {

    // Initialize log in button that will be shown after successful reset.
    $('#tresdb-continue-to-login-button').click(function (ev) {
      ev.preventDefault();

      return showLogin();
    });

    $('#tresdb-reset-password-form').submit(submitHandler);
  };

  this.unbind = function () {
    $('#tresdb-continue-to-login-button').off();
    $('#tresdb-reset-password-form').off();
  };


  // Private methods

  submitHandler = function (ev) {
    // User has typed in two passwords and submitted the form.
    ev.preventDefault();

    var password = $('#tresdb-input-new-password').val();
    var passwordAgain = $('#tresdb-input-again-password').val();

    // Validate
    if (password !== passwordAgain || password === '') {
      // Display error message
      $('#tresdb-reset-password-no-match').removeClass('hidden');

      return;
    }  // else

    // Reveal loading animation.
    $('#tresdb-reset-in-progress').removeClass('hidden');
    // Hide the password form.
    $('#tresdb-reset-password-form').addClass('hidden');
    // Hide possible earlier no-match error message
    $('#tresdb-reset-password-no-match').addClass('hidden');

    account.resetPassword(token, password, responseHandler);
  };

  responseHandler = function (err) {
    if (!err) {
      // Successful reset
      // Reveal success message
      $('#tresdb-reset-password-success').removeClass('hidden');
      // Reveal "Continue to log in" button
      $('#tresdb-reset-password-login').removeClass('hidden');
      // Hide the loading animation
      $('#tresdb-reset-in-progress').addClass('hidden');

      return;
    }  // else

    if (err.message === 'Unauthorized') {
      // False token
      // Display token error message.
      $('#tresdb-reset-password-token-error').removeClass('hidden');
      // Reveal "Continue to log in" button
      $('#tresdb-reset-password-login').removeClass('hidden');
      // Hide the loading animation
      $('#tresdb-reset-in-progress').addClass('hidden');

      return;
    }  // else

    // Invalid password (too short?)
    // Invalid email (no such account)
    // Server down
    // Database down
    console.error(err);
    // Display error message.
    $('#tresdb-reset-password-server-error').removeClass('hidden');
    // Display the original form
    $('#tresdb-reset-password-form').removeClass('hidden');
    // Hide the loading animation
    $('#tresdb-reset-in-progress').addClass('hidden');
  };

};

var account = require('../../stores/account');
var template = require('./template.ejs');
var emitter = require('component-emitter');

module.exports = function () {

  // Init
  emitter(this);

  // Private methods declaration

  var submitHandler;
  var responseHandler;


  // Public methods

  this.bind = function ($mount) {

    $mount.html(template({
      user: account.getUser(),
    }));

    $('#tresdb-change-password-form').submit(submitHandler);
  };

  this.unbind = function () {
    $('#tresdb-change-password-form').off();
  };


  // Private methods

  submitHandler = function (ev) {
    ev.preventDefault();

    // Get input values
    var curPass = $('#tresdb-input-current-password').val();
    var newPass = $('#tresdb-input-new-password').val();
    var agaPass = $('#tresdb-input-again-password').val();

    // Clear possible earlier error messages
    $('#tresdb-change-password-invalid-curpass').addClass('hidden');
    $('#tresdb-change-password-invalid-newpass').addClass('hidden');
    $('#tresdb-change-password-incorrect-curpass').addClass('hidden');
    $('#tresdb-change-password-server-error').addClass('hidden');

    // Validate input
    if (curPass === '') {
      $('#tresdb-change-password-invalid-curpass').removeClass('hidden');

      return;
    } // else
    if (newPass === '' || newPass !== agaPass) {
      $('#tresdb-change-password-invalid-newpass').removeClass('hidden');

      return;
    } // else

    // Okay, everything good. Request server to change password.

    // Display the progress bar
    $('#tresdb-change-password-in-progress').removeClass('hidden');
    // Hide the form
    $('#tresdb-change-password-form').addClass('hidden');

    account.changePassword(curPass, newPass, responseHandler);
  };

  responseHandler = function (err) {

    // Hide the progress bar
    $('#tresdb-change-password-in-progress').addClass('hidden');

    if (err) {
      if (err.message === 'Unauthorized') {
        // Show form and error message.
        $('#tresdb-change-password-form').removeClass('hidden');
        $('#tresdb-change-password-incorrect-curpass').removeClass('hidden');
        return;
      }  // else

      // A rare error. Show error:
      $('#tresdb-change-password-server-error').removeClass('hidden');
      $('#tresdb-change-password-server-error-name').text(err.message);
      return;
    }  // else

    // Successfully changed. Show success message. No need to show form.
    $('#tresdb-change-password-success').removeClass('hidden');
    return;
  };

};
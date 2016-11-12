var marked = require('marked');
var timestamp = require('./lib/timestamp');
var geostamp = require('./lib/geostamp');

// Templates
var locationTemplate = require('../../templates/forms/location.ejs');

module.exports = function (loc, api) {
  // Parameters
  //   loc
  //     Location object
  //   api
  //     locations.Service instance

  // Init

  // Sort content, newest first, create-event to bottom.
  loc.content.sort(function comp(a, b) {
    if (a.time < b.time) {
      return 1;
    }
    if (a.time > b.time) {
      return -1;
    }
    if (a.type === 'created') {
      return 1;
    }
    return 0;
  });

  // Private methods declaration

  // Public methods

  this.render = function () {

    return locationTemplate({
      location: loc,
      marked: marked,  // markdown parser
      geostamp: geostamp,
      timestamp: timestamp,
    });
  };

  this.bind = function () {

    // Listen possible changes in the location.
    api.on('locations/rename/success', function (updatedLoc) {
      if (loc._id === updatedLoc._id) {
        loc.name = updatedLoc.name;
        var s = (updatedLoc.name === '' ? 'Untitled' : updatedLoc.name);
        $('#tresdb-location-name').text(s);
      }
    });

    // Enable tooltips. See http://getbootstrap.com/javascript/#tooltips
    $('[data-toggle="tooltip"]').tooltip();

    // Rename form
    $('#tresdb-location-rename-show').click(function (ev) {
      ev.preventDefault();

      if ($('#tresdb-location-rename-form').hasClass('hidden')) {
        // Show
        $('#tresdb-location-rename-form').removeClass('hidden');
        // Remove possible error messages
        $('#tresdb-location-rename-error').addClass('hidden');
        // Prefill the form with the current name
        $('#tresdb-location-rename-input').val(loc.name);
        // Focus to input field
        $('#tresdb-location-rename-input').focus();
      } else {
        // Hide
        $('#tresdb-location-rename-form').addClass('hidden');
        // Remove possible error messages
        $('#tresdb-location-rename-error').addClass('hidden');
      }
    });

    $('#tresdb-location-rename-cancel').click(function (ev) {
      ev.preventDefault();
      $('#tresdb-location-rename-form').addClass('hidden');
    });

    $('#tresdb-location-rename-form').submit(function (ev) {
      ev.preventDefault();

      var newName = $('#tresdb-location-rename-input').val().trim();
      var oldName = loc.name;

      if (newName === oldName) {
        // If name not changed, just close the form.
        $('#tresdb-location-rename-form').addClass('hidden');
        $('#tresdb-location-rename-error').addClass('hidden');
      }

      api.rename(loc._id, newName, function (err) {
        if (err) {
          console.error(err);
          $('#tresdb-location-rename-form').addClass('hidden');
          $('#tresdb-location-rename-error').removeClass('hidden');
        }

        $('#tresdb-location-rename-form').addClass('hidden');
      });
    });
  };


  // Private methods

};

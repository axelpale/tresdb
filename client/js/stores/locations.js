
var emitter = require('component-emitter');
var account = require('./account');
var Location = require('../models/Location');

module.exports = (function () {

  // Init
  emitter(this);
  var self = this;

  // To inform views (especially Map) about changes in locations,
  // we listen the previously created/retrieved location. This surveillance
  // should cover all the locations in the cache but as we do not have a cache,
  // the easiest solution is to listen only the last retrieved location.
  var listenForChanges = (function () {
    var loc2listen = null;

    var savedHandler = function () {
      self.emit('location_changed', loc2listen);
    };

    var removeHandler = function () {
      self.emit('location_removed', loc2listen);
      loc2listen = null;
    };

    return function listen(location) {
      // Parameters
      //   location
      //     a models.Location
      if (loc2listen !== null) {
        loc2listen.off('saved', savedHandler);
        loc2listen.off('removed', removeHandler);
        loc2listen = null;
      }

      loc2listen = location;
      loc2listen.on('saved', savedHandler);
      loc2listen.on('removed', removeHandler);
    };
  }());

  this.create = function (geom, callback) {
    // Create a new location on the server.
    //
    // Parameters:
    //   geom
    //     GeoJSON Point
    //   callback
    //     function (err, createdLocation)

    $.ajax({
      url: '/api/locations',
      method: 'POST',
      data: {
        lat: geom.coordinates[1],
        lng: geom.coordinates[0],
      },
      dataType: 'json',
      headers: { 'Authorization': 'Bearer ' + account.getToken() },
      success: function (rawLoc) {

        var newLoc = new Location(rawLoc);

        // Emit changes of this location until next loc in focus.
        listenForChanges(newLoc);

        // Inform others that new location has been created.
        self.emit('location_changed', newLoc);

        return callback(null, newLoc);
      },
      error: function (jqxhr, textStatus, errorThrown) {
        return callback(errorThrown);
      },
    });
  };

  this.get = function (id, callback) {
    // Fetch a location from server and return a models.Location instance.
    // Will call back with error if not found.
    //
    // Parameters:
    //   id
    //     ID string
    //   callback
    //     function (err, location)
    //

    $.ajax({
      url: '/api/locations/' + id,
      method: 'GET',
      dataType: 'json',
      headers: { 'Authorization': 'Bearer ' + account.getToken() },
      success: function (rawLoc) {

        var loc = new Location(rawLoc);
        listenForChanges(loc);

        return callback(null, loc);
      },
      error: function (jqxhr, textStatus, errorThrown) {
        return callback(errorThrown);
      },
    });
  };

  return this;
}());
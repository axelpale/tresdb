var _ = require('lodash');

module.exports = function (model) {
  // Parameters
  //   model
  //     MapModel instance

  // Store markers so they can be removed.
  var markers = [];

  // Initialize map and controls.

  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 61.498151, lng: 23.761025},
    zoom: 8,
    mapTypeId: 'hybrid',  // Darker and more practial than 'roadmap'.

    // Controls
    mapTypeControl: true,
    mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_RIGHT
    },
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    zoomControl: true,
    zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
    }
  });

  // Initialize model handling

  model.on('update', function (locations) {
    // On model update, refresh locations on the map.

    console.log('MapView: redraw locations');

    // Remove old markers. TODO partial update.
    _.each(markers, function (mk) {
      mk.setMap(null);
    });
    markers = [];

    // Add new markers. TODO partial update
    _.each(locations, function (loc) {
      var m = new google.maps.Marker({
        position: new google.maps.LatLng(loc.lat, loc.lng),
        title: loc.name
      });
      m.setMap(map);
      markers.push(m);
    });
  });

  model.on('error', function (err) {
    console.error(err);
  });

  // Public methods

  this.addControl = function (htmlElement) {
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(htmlElement);
  }
};

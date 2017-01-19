/* eslint-disable max-statements, max-lines */
/* global google */

var MapStateStore = require('../models/MapStateStore');

var icons = require('./lib/icons');
var labels = require('./lib/labels');
var getBoundsDiagonal = require('./lib/getBoundsDiagonal');
var readGoogleMapState = require('./lib/readGoogleMapState');

module.exports = function (storage, locations, go) {
  // Parameters:
  //   storage
  //     e.g. a localStorage
  //   locations
  //     models.Locations instance.
  //   go
  //     function (path): ask router to go to path.
  //

  // Private methods declaration

  var addMarker;
  var removeMarker;
  var updateMarkers;

  // Init

  // Element for the google map
  var htmlElement = document.getElementById('map');

  // Remember map view state (center, zoom, type...)
  // Default to southern Finland.
  //
  // Rules:
  // - Whenever user's location on the map changes, the new location
  //   should be stored device-wise.
  // - If no location is stored and none can be retrieved from the browser,
  //   fallback to southern finland.
  var mapStateStore = new MapStateStore(storage, {
    // Default map state
    lat: 61.0,
    lng: 24.0,
    zoom: 6,
    // 'hybrid' is darker and more practical than 'roadmap'
    mapTypeId: 'hybrid',
  });

  // Does the map load markers from the locations and display them on the map.
  // Will be set when client is ready to load markers (logged in)
  var loaderListener = null;

  // Location markers on the map. A mapping from id to google.maps.Marker
  var markers = {};

  // An addition marker. User moves this large marker to point where
  // the new location is to be created.
  var additionMarker = null;

  // Marker that represents geolocation of the user
  var geolocationMarker = null;
  var geolocationWatchId = null;

  // Get initial map state i.e. coordinates, zoom level, and map type
  var initMapState = mapStateStore.get();

  var map = new google.maps.Map(htmlElement, {
    center: {
      lat: initMapState.lat,
      lng: initMapState.lng,
    },
    zoom: initMapState.zoom,
    mapTypeId: initMapState.mapTypeId,

    // Controls
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    streetViewControl: true,
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
    },
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM,
    },
  });

  // Make addition marker to follow map center.
  map.addListener('center_changed', function () {
    if (additionMarker) {
      additionMarker.setPosition(map.getCenter());
    }
  });

  // Listen for changes in locations so that the markers and labels
  // are up to date.
  locations.on('location_changed', function (updatedLoc) {
    // Parameters
    //   updatedLoc
    //     models.Location
    var m, mloc;

    mloc = updatedLoc.getMarkerLocation();

    if (markers.hasOwnProperty(mloc._id)) {
      m = markers[mloc._id];
      m.set('location', mloc);

      // Force update even if label already visible
      labels.ensureLabel(m, map.getMapTypeId(), true);
    } else {
      // New location
      addMarker(mloc);
    }
  });

  // Listen map type change to invert label text colors.
  map.addListener('maptypeid_changed', function () {
    labels.updateMarkerLabels(markers, map.getMapTypeId());
  });

  // Listen zoom level change to only show labels of locations
  // with higher level than current zoom level.
  map.addListener('zoom_changed', function () {
    var z, k, m, loc;

    z = map.getZoom();

    for (k in markers) {
      if (markers.hasOwnProperty(k)) {
        m = markers[k];
        loc = m.get('location');
        if (loc.layer < z - 1) {
          // Ensure that label is visible.
          labels.ensureLabel(m, map.getMapTypeId());
        } else {
          labels.hideLabel(m);
        }
      }
    }
  });

  (function defineMapStateChange() {
    // Save new state to storage when the state of the map changes.
    var handleStateChange = function () {
      mapStateStore.update(readGoogleMapState(map));
    };
    map.addListener('idle', handleStateChange);
    map.addListener('maptypeid_changed', handleStateChange);
  }());


  // Public methods

  this.addControl = function (content, bind) {
    // Add custom content e.g. a menu on the map.
    // Bind events only after the control content is added to dom.
    // See http://stackoverflow.com/questions/17051816/
    //
    // Parameters:
    //   content
    //     string, contains html
    //   bind
    //     function (controlContainerEl)
    var el = document.createElement('div');

    el.className = 'tresdb-map-menu';
    el.innerHTML = content;
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(el);
    bind(el);
  };

  this.getMap = function () {
    return map;
  };

  this.removeControls = function () {
    // Remove all custom elements.
    map.controls[google.maps.ControlPosition.LEFT_TOP].clear();
  };

  this.setState = function (mapstate) {
    // Change viewport state
    map.setCenter({
      lat: mapstate.lat,
      lng: mapstate.lng,
    });
    map.setZoom(mapstate.zoom);
    map.setMapTypeId(mapstate.mapTypeId);
  };

  this.hideGeolocation = function () {
    // Stop watching device's location
    if (geolocationWatchId !== null) {
      if ('geolocation' in navigator) {
        navigator.geolocation.clearWatch(geolocationWatchId);
        geolocationWatchId = null;
      }
    }
    // Remove marker
    if (geolocationMarker !== null) {
      geolocationMarker.setMap(null);
      geolocationMarker = null;
    }
  };

  this.showGeolocation = function () {
    // Show current location on the map. Does nothing if already shown.

    var update, geoSuccess, geoError, id;

    // If geolocation is not already shown and geolocation is available.
    if (geolocationMarker === null && 'geolocation' in navigator) {

      geolocationMarker = new google.maps.Marker({
        position: new google.maps.LatLng(0.0, 0.0),
        map: map,
        icon: icons.geolocation(),
      });

      update = function (lat, lng) {
        geolocationMarker.setPosition({
          lat: lat,
          lng: lng,
        });
      };

      geoSuccess = function (position) {
        update(position.coords.latitude, position.coords.longitude);
      };

      geoError = function (err) {
        console.error(err);
      };

      id = navigator.geolocation.watchPosition(geoSuccess, geoError);
      geolocationWatchId = id;

    }  // Else, no navigator.geolocation available
  };

  this.startLoadingMarkers = function () {
    // Each idle, fetch a new set of locations.
    // The idle is emitted automatically after the initial map load.

    // Prevent duplicate listeners.
    if (loaderListener !== null) {
      return;
    }

    loaderListener = map.addListener('idle', function () {
      var center = map.getCenter();
      var bounds = map.getBounds();
      var radius = Math.ceil(getBoundsDiagonal(bounds) / 2);
      var zoom = map.getZoom();

      locations.getMarkersWithin(center, radius, zoom, function (err, locs) {
        if (err) {
          return console.error(err);
        }  // else

        updateMarkers(locs);
      });
    });
  };

  this.stopLoadingMarkers = function () {
    google.maps.event.removeListener(loaderListener);
    loaderListener = null;
  };

  this.removeAllMarkers = function () {
    // Clear the map.
    for (var i in markers) {
      if (markers.hasOwnProperty(i)) {
        removeMarker(markers[i]);
      }
    }
  };

  this.addAdditionMarker = function () {
    // Creates a draggable marker at the middle of the map.
    additionMarker = new google.maps.Marker({
      position: map.getCenter(),
      map: map,
      icon: icons.additionMarker(),
      draggable: true,
    });

    additionMarker.addListener('dragend', function () {
      // Move the map so that the marker is at the middle.
      map.panTo(additionMarker.getPosition());
    });
  };

  this.getAdditionMarkerGeom = function () {
    // Return GeoJSON Point at the addition marker. Throws if
    // the marker is not set.

    if (additionMarker === null) {
      throw new Error('additionMarker needs to be created first');
    }

    var latlng = additionMarker.getPosition();

    return {
      type: 'Point',
      coordinates: [latlng.lng(), latlng.lat()],
    };
  };

  this.removeAdditionMarker = function () {
    // Remove addition marker from the map.
    additionMarker.setMap(null);
    additionMarker = null;
  };


  // Private methods

  addMarker = function (loc) {
    // Create marker and add it to the map.
    //
    // Parameters:
    //   loc
    //     MarkerLocation
    // Return
    //   the created marker
    var lng, lat, m;

    lng = loc.geom.coordinates[0];
    lat = loc.geom.coordinates[1];

    m = new google.maps.Marker({
      position: new google.maps.LatLng(lat, lng),
      icon: icons.marker(),
    });

    // Store the MarkerLocation for _id, name, and layer info.
    m.set('location', loc);

    // Label only the important, higher markers.
    if (loc.layer < map.getZoom() - 1) {
      labels.ensureLabel(m, map.getMapTypeId(), true);
    }

    m.setMap(map);
    m.addListener('click', function () {

      if (labels.hasLabel(m)) {
        go('/location/' + loc._id);
      } else {
        labels.ensureLabel(m, map.getMapTypeId(), true);
      }

    });

    m.set('id', loc._id);
    markers[loc._id] = m;

    return m;
  };

  removeMarker = function (m) {
    if (m) {
      m.setMap(null);
      delete markers[m.get('id')];
    }
  };

  updateMarkers = function (locs) {
    // Add new markers and removes the excess.
    // To speed up things and avoid flicker,
    // only adds those markers on the screen that are not already there.

    var i, l, m, k;

    // For each location candidate
    for (i = 0; i < locs.length; i += 1) {
      l = locs[i];

      // If location already on the map
      if (markers.hasOwnProperty(l._id)) {
        // Mark that it does not need to be removed.
        markers[l._id].set('keep', true);
      } else {
        // otherwise, add it to the map.
        m = addMarker(l);
        m.set('keep', true);
      }
    }

    // Remove markers that were not marked to be kept.
    // Also, reset keep for next update.
    for (i in markers) {
      if (markers.hasOwnProperty(i)) {
        m = markers[i];
        k = m.get('keep');

        if (k) {
          // Reset for next update
          m.set('keep', false);
        } else {
          // Remove
          removeMarker(m);
        }
      }
    }

  };

};
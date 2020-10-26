/* eslint-disable max-lines, max-statements, no-lonely-if */
/* global google */

// LocationMarkers is a marker manager.

var markerStore = tresdb.stores.markers;
var account = tresdb.stores.account;
var filterStore = tresdb.stores.filter;
var emitter = require('component-emitter');
var rawEventToMarkerLocation = require('./lib/rawEventToMarkerLocation');
var getBoundsDiagonal = require('./lib/getBoundsDiagonal');
var VisitedManager = require('./VisitedManager');
var getGridSize = require('./getGridSize');
var chooseIcon = require('./chooseIcon');
var labels = require('./lib/labels');

module.exports = function (map) {

  // Init
  var self = this;
  emitter(self);

  // Location markers on the map. A mapping from id to google.maps.Marker
  var _markers = {};

  // Does the map load markers from the locations and display them on the map.
  // Will be set when client is ready to load markers (logged in)
  var _loaderListener = null;

  // True if map is ready for use. Will be switched to true at the first
  // 'idle' event. See addListenerOnce('idle', ...) below.
  // We need to track this for startLoadingMarkers: if map is ready
  // then load the markers immediately when called, otherwise wait for idle.
  var _mapReady = false;

  // Array of ids of locations that the user has visited.
  // Fetch them as soon as possible.
  var _visitedIds = new VisitedManager();

  // Private methods

  var _chooseIcon = function (mloc) {
    var zoomLevel = map.getZoom();
    return chooseIcon(mloc, zoomLevel, _visitedIds);
  };

  var _addMarker = function (mloc) {
    // Create marker and add it to the map.
    //
    // Parameters:
    //   mloc
    //     a MarkerLocation.
    // Return
    //   the created marker
    var lng, lat, m;

    lng = mloc.geom.coordinates[0];
    lat = mloc.geom.coordinates[1];

    m = new google.maps.Marker({
      position: new google.maps.LatLng(lat, lng),
      icon: _chooseIcon(mloc),
      // Order markers so that northern markers are always behind.
      // eslint-disable-next-line no-magic-numbers
      zIndex: Math.floor((100 - lat) * 1048576),
    });

    // Store the MarkerLocation for _id, name, and layer info.
    m.set('location', mloc);

    // Label only the important, higher markers.
    if (mloc.layer < map.getZoom() - 1) {
      labels.ensureLabel(m, map.getMapTypeId(), true);
    }

    m.setMap(map);
    m.addListener('click', function () {

      if (labels.hasLabel(m)) {
        self.emit('marker_activated', mloc);
      } else {
        // First click shows the label
        labels.ensureLabel(m, map.getMapTypeId(), true);
      }

    });

    m.set('id', mloc._id);
    _markers[mloc._id] = m;

    return m;
  };

  var _removeMarker = function (m) {
    if (m) {
      // Remove from map
      m.setMap(null);

      // Remove click listener
      google.maps.event.clearInstanceListeners(m);

      delete _markers[m.get('id')];
    }
  };

  var _updateMarkers = function (locs) {
    // Add new markers and removes the excess.
    // To speed up things and avoid flicker,
    // only adds those markers on the screen that are not already there.

    var i, l, m, mloc, k;

    // For each location candidate
    for (i = 0; i < locs.length; i += 1) {
      l = locs[i];

      // If location already on the map
      if (_markers.hasOwnProperty(l._id)) {
        // Mark that it does not need to be removed.
        m = _markers[l._id];
        m.set('keep', true);
        // HACK Update dynamic layer and childLayer properties to
        // display child mark properly.
        // In filtered results the layer and childLayer changes constantly.
        mloc = m.get('location');
        mloc.layer = l.layer;
        mloc.childLayer = l.childLayer;
        m.setIcon(_chooseIcon(mloc)); // Update icon accordingly
      } else {
        // otherwise, add it to the map.
        m = _addMarker(l);
        m.set('keep', true);
      }
    }

    // Remove markers that were not marked to be kept.
    // Also, reset keep for next update.
    for (i in _markers) {
      if (_markers.hasOwnProperty(i)) {
        m = _markers[i];
        k = m.get('keep');

        if (k) {
          // Reset for next update
          m.set('keep', false);
        } else {
          // Remove
          _removeMarker(m);
        }
      }
    }

  };

  var _loadMarkersThen = function (err, locs) {
    if (err) {
      return console.error(err);
    } // else
    _updateMarkers(locs);
  };

  var _loadMarkers = function () {
    // Load markers for current viewport.
    // Take into consideration the current
    // - map center,
    // - map zoom level
    // - viewport size
    // - filter settings
    var bounds = map.getBounds();
    var zoom = map.getZoom();

    if (filterStore.isActive()) {
      // Query filtered set of locations.
      var filterState = filterStore.get();
      var boundsLiteral = bounds.toJSON();
      var gridSize = getGridSize();
      markerStore.getFilteredWithin({
        east: boundsLiteral.east,
        north: boundsLiteral.north,
        south: boundsLiteral.south,
        west: boundsLiteral.west,
        type: filterState.type,
        layer: zoom,
        gridWidth: gridSize.width,
        gridHeight: gridSize.height,
      }, _loadMarkersThen);
    } else {
      // No filtration
      var center = map.getCenter();
      var radius = Math.ceil(getBoundsDiagonal(bounds) / 2);
      markerStore.getWithin(center, radius, zoom, _loadMarkersThen);
    }
  };

  // Bind

  // Listen for changes in locations so that the markers and labels
  // are up to date.
  markerStore.on('location_name_changed', function (ev) {
    // Parameters
    //   ev
    //     ev.data.newName
    var m, mloc;

    // No need to update if no such marker on the map.
    if (!_markers.hasOwnProperty(ev.locationId)) {
      return;
    }

    // Update name of markerLocation
    m = _markers[ev.locationId];
    mloc = m.get('location');
    mloc.name = ev.data.newName;

    // Refresh label. Force update even if label already visible
    labels.ensureLabel(m, map.getMapTypeId(), true);
  });

  markerStore.on('location_geom_changed', function (ev) {
    // Parameters
    //   ev
    //     ev.data.newGeom
    var m, g, mloc;

    // No need to update if no such marker on the map.
    if (!_markers.hasOwnProperty(ev.locationId)) {
      return;
    }

    // Update geom of markerLocation
    g = ev.data.newGeom;
    m = _markers[ev.locationId];
    mloc = m.get('location');
    mloc.geom = g;

    // Ensure coordinates are up to date
    m.setPosition({
      lat: g.coordinates[1],
      lng: g.coordinates[0],
    });
  });

  markerStore.on('location_created', function (ev) {
    var mloc = rawEventToMarkerLocation(ev);
    _addMarker(mloc);
  });

  markerStore.on('location_removed', function (ev) {
    if (_markers.hasOwnProperty(ev.locationId)) {
      var mToRemove = _markers[ev.locationId];
      _removeMarker(mToRemove);
    }
  });

  markerStore.on('location_status_changed', function (ev) {
    // Update icon according to new status.
    // Do this only if the marker has reached the map.
    if (_markers.hasOwnProperty(ev.locationId)) {
      var m = _markers[ev.locationId];
      var mloc = m.get('location');
      // First update the stored MarkerLocation
      mloc.status = ev.data.newStatus;
      // Update icon accordingly
      m.setIcon(_chooseIcon(mloc));
    }
  });

  markerStore.on('location_type_changed', function (ev) {
    // Update icon according to new type.
    // Do this only if the marker has reached the map.
    if (_markers.hasOwnProperty(ev.locationId)) {
      var m = _markers[ev.locationId];
      var mloc = m.get('location');
      // First update the stored MarkerLocation
      mloc.type = ev.data.newType;
      // Update icon accordingly
      m.setIcon(_chooseIcon(mloc));
    }
  });

  markerStore.on('location_entry_created', function (ev) {
    if (ev.data.isVisit && account.isMe(ev.user)) {
      // Add loc among visited locations if not visited before by this user.
      _visitedIds.add(ev.locationId);

      // Update marker icon to visited
      if (_markers.hasOwnProperty(ev.locationId)) {
        var m = _markers[ev.locationId];
        var mloc = m.get('location');
        m.setIcon(_chooseIcon(mloc));
      }
    }
  });

  markerStore.on('location_entry_changed', function (ev) {
    var m, mloc;

    // Change from non-visit to visit
    if (ev.data.newIsVisit && !ev.data.oldIsVisit && account.isMe(ev.user)) {
      // Add loc among visited locations if not visited before by this user.
      _visitedIds.add(ev.locationId);

      // Update marker icon to visited
      if (_markers.hasOwnProperty(ev.locationId)) {
        m = _markers[ev.locationId];
        mloc = m.get('location');
        m.setIcon(_chooseIcon(mloc));
      }
    } else {
      // From visit to non-visit
      if (ev.data.oldIsVisit && !ev.data.newIsVisit) {
        _visitedIds.remove(ev.locationId);

        // Update marker icon to unvisited
        if (_markers.hasOwnProperty(ev.locationId)) {
          m = _markers[ev.locationId];
          mloc = m.get('location');
          m.setIcon(_chooseIcon(mloc));
        }
      }
    }
  });

  // Listen map type change to invert label text colors.
  map.addListener('maptypeid_changed', function () {
    labels.updateMarkerLabels(_markers, map.getMapTypeId());
  });

  map.addListener('zoom_changed', function () {
    var z, k, m, mloc;

    z = map.getZoom();

    // Listen zoom level change to only show labels of locations
    // with higher level than current zoom level.
    for (k in _markers) {
      if (_markers.hasOwnProperty(k)) {
        m = _markers[k];
        mloc = m.get('location');
        if (mloc.layer < z - 1) {
          // Ensure that label is visible.
          labels.ensureLabel(m, map.getMapTypeId());
        } else {
          labels.hideLabel(m);
        }
      }
    }

    // Listen zoom level change to update symbols of locations
    // when all their children become visible or hidden.
    for (k in _markers) {
      if (_markers.hasOwnProperty(k)) {
        m = _markers[k];
        mloc = m.get('location');

        // Ensure that the correct marker icon is used.
        // They are zoom-sensitive.
        m.setIcon(_chooseIcon(mloc));
      }
    }
  });

  // Track when map becomes usable.
  // See 'var _mapReady = false' above for details.
  google.maps.event.addListenerOnce(map, 'idle', function () {
    _mapReady = true;
  });



  // Public methods

  self.startLoading = function () {
    // Each idle, fetch a new set of locations.
    // The idle is emitted automatically after the initial map load.

    // Prevent duplicate listeners.
    if (_loaderListener !== null) {
      return;
    }

    // Each time map stops, fetch.
    _loaderListener = map.addListener('idle', _loadMarkers);
    // Load the first manually but only if the map is ready.
    // Map emits 'idle' when ready but user might not have been logged in yet.
    if (_mapReady) {
      _loadMarkers();
    }

    // Each time filter changes, fetch.
    filterStore.on('updated', _loadMarkers);

    // Fetch the list of visited locations as soon as possible.
    account.getVisitedLocationIds(function (err, ids) {
      if (err) {
        console.error(err);
        return;
      }

      _visitedIds.set(ids);
    });
  };

  self.stopLoading = function () {
    google.maps.event.removeListener(_loaderListener);
    filterStore.off('updated', _loadMarkers);
    _loaderListener = null;
  };

  self.removeAll = function () {
    // Clear the map.
    for (var i in _markers) {
      if (_markers.hasOwnProperty(i)) {
        _removeMarker(_markers[i]);
      }
    }
  };

};

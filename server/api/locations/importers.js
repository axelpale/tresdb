/* eslint-disable max-statements,max-lines */

//var local = require('../../../config/local');
//var tempdirs = require('../../services/tempdirs');
var xmltransform = require('camaro');
var toMarkdown = require('to-markdown');
var extract = require('extract-zip');
var path = require('path');
var fs = require('fs-extra');


exports.readKML = function (kmlpath, callback) {
  // Find an array of locations from a KML file.
  //
  // Parameters
  //   kmlpath
  //     a path to the KML file
  //   callback
  //     function (err, locations)
  //
  // Rules
  // - descriptions and GroundOverlays in a Folder are attached under
  //   the location created for the first Placemark within
  //   the Folder.
  //
  var placemarkTemplate = {
    name: 'name',
    description: 'description',
    coordinates: 'Point/coordinates',
    line: 'LineString/coordinates',
    polygon: 'Polygon//coordinates',
  };

  var overlayTemplate = {
    name: 'name',
    description: 'description',
    href: './Icon/href',
    viewBoundScale: 'number(./Icon/viewBoundScale)',
    latLonBox: {
      north: 'number(./LatLonBox/north)',
      south: 'number(./LatLonBox/south)',
      east: 'number(./LatLonBox/east)',
      west: 'number(./LatLonBox/west)',
      rotation: 'number(./LatLonBox/rotation)',
    },
  };

  var template = {
    rootLocations: ['//Document/Placemark', placemarkTemplate],
    folders: ['//Folder', {
      description: 'description',
      locations: ['./Placemark', placemarkTemplate],
      overlays: ['./GroundOverlay', overlayTemplate],
    }],
  };

  fs.readFile(kmlpath, function (errf, kmlxml) {
    if (errf) {
      return callback(errf);
    }

    var result = xmltransform(kmlxml, template);

    // Combine locations
    var finalLocations = result.rootLocations;
    result.folders.forEach(function (folder) {

      if (folder.locations.length > 0) {
        var first = folder.locations[0];

        first.descriptions = [folder.description];
        first.overlays = folder.overlays;
      }

      finalLocations = finalLocations.concat(folder.locations);
    });

    // Format locations: remove empty properties
    finalLocations.forEach(function (loc) {

      // Combine descriptions
      if (loc.hasOwnProperty('descriptions')) {
        loc.descriptions.push(loc.description);
      } else {
        loc.descriptions = [loc.description];
      }
      delete loc.description;

      // Remove empty descriptions
      loc.descriptions = loc.descriptions.filter(function (desc) {
        return desc.length > 0;
      });

      // Convert descriptions to markdown
      loc.descriptions = loc.descriptions.map(function (desc) {
        return toMarkdown(desc);
      });

      // Combine coordinates from Point, LineString, and Polygon.
      // Parse and compute naive average.
      var avgLonLat = (function () {

        var combined = loc.coordinates;  // empty string if do coords
        if (loc.line.length > 0) {
          combined = combined + ' ' + loc.line;
        }
        if (loc.polygon.length > 0) {
          combined = combined + ' ' + loc.polygon;
        }

        var points = combined.trim().split(' ');
        var numPoints = points.length;

        var sum = points.reduce(function (acc, p) {
          var lonLat = p.split(',');
          acc[0] += parseFloat(lonLat[0]);
          acc[1] += parseFloat(lonLat[1]);
          return acc;
        }, [0, 0]);

        return [
          sum[0] / numPoints,
          sum[1] / numPoints,
        ];

      }());

      // Remove now unnecessary coordinates;
      loc.longitude = avgLonLat[0];
      loc.latitude = avgLonLat[1];
      delete loc.coordinates;
      delete loc.line;
      delete loc.polygon;

      // Always have overlays even when empty
      if (!loc.hasOwnProperty('overlays')) {
        loc.overlays = [];
      }
    });

    return callback(null, finalLocations);
  });
};


exports.readKMZ = function (kmzpath, callback) {
  // KMZ is a zipped collection of resources and KML files.
  // The collection contains images and therefore we must temporarily
  // store them.

  var targetPath = path.dirname(kmzpath);

  extract(kmzpath, {
    dir: targetPath,
  }, function (erre) {
    if (erre) {
      return callback(erre);
    }
    return callback(null, ['success']);
  });


  // // Save zip to a temporary directory
  // tempdirs.getDir(local.tempUploadDir, function (err, tempDir) {
  //   if (err) {
  //     return callback(err);
  //   }
  //
  //   var targetPath = tempDir.getPath();
  //   console.log(targetPath);
  //
  // });
};


exports.readGPX = function (buffer, callback) {
  // Find an array of locations from a GPX file.
  //
  // Parameters
  //   buffer
  //     a Buffer that represents GPX file
  //   callback
  //     function (err, locations)

  // dummy
  return callback(null, [
    {
      name: 'Fooloc',
      lat: 62.0,
      lng: 23.0,
      description: 'This is a location from GPX',
    },
  ]);
};
// Component to filter map markers.
//
var geostamp = require('geostamp');
var template = require('./template.ejs');

module.exports = function () {
  // Init

  var defaultSystemName = tresdb.config.coordinateSystems[0][0];
  var coordsTemplate = tresdb.templates[defaultSystemName];

  var _$mount = null;

  // Public methods

  this.bind = function ($mount) {
    _$mount = $mount;
    _$mount.html(template());
  };

  this.updateGeometry = function (geoms) {
    if (_$mount) {
      var defaultCoords = geoms[defaultSystemName];
      var lat = defaultCoords[1];
      var lng = defaultCoords[0];
      var h = geostamp.html(coordsTemplate, lat, lng);

      _$mount.find('.crosshair-geostamp').html(h);
    }
  };

  this.unbind = function () {
    _$mount = null;
  };
};

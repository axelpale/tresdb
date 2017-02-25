
var getEntryView = require('./lib/getEntryView');

module.exports = function (entries) {
  // Parameters:
  //   entries
  //     EntriesModel

  var _entryViewsMap = {};  // id -> entryView

  var _handleEntryCreated;
  var _handleEntryRemoved;


  this.bind = function ($mount) {

    var ents = entries.toArray();

    ents.forEach(function (e) {
      var id = e.getId();
      var v = getEntryView(e);

      _entryViewsMap[id] = v;

      $mount.append('<div id="' + id + '"></div>');
      v.bind($('#' + id));
    });

    _handleEntryCreated = function (ev) {
      // Create view and store it among others

      var newEntry = entries.getEntry(ev.data.entryId);
      var id = newEntry.getId();
      var v = getEntryView(newEntry);

      _entryViewsMap[id] = v;

      $mount.prepend('<div id="' + id + '"></div>');
      v.bind($('#' + id));
    };

    _handleEntryRemoved = function (ev) {

      // Remove entry from _entryViewsMap.
      var id = ev.data.entryId;
      var v = _entryViewsMap[id];
      delete _entryViewsMap[id];

      // Remove entry's HTML and unbind view.
      v.unbind();
      $('#' + id).fadeOut('slow', function () {
        $('#' + id).remove();
      });
    };

    entries.on('location_entry_created', _handleEntryCreated);
    entries.on('location_entry_removed', _handleEntryRemoved);
  };

  this.unbind = function () {

    // Unbind each child
    var k, v;
    for (k in _entryViewsMap) {
      if (_entryViewsMap.hasOwnProperty(k)) {
        v = _entryViewsMap[k];
        v.unbind();
      }
    }

    entries.off('location_entry_created', _handleEntryCreated);
    entries.off('location_entry_removed', _handleEntryRemoved);
  };
};
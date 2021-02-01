// A list of images from entries.

var ThumbnailView = require('./Thumbnail');

module.exports = function (entries) {
  // Parameters:
  //   entries: a list of Entry models. Use same models with Entries view.
  //

  // Keep track of created views and handlers for easy unbind.
  var _thumbnailViewsMap = {};  // id -> thumbnailView
  var _handleEntryCreated;
  var _handleEntryRemoved;

  this.bind = function ($mount) {

    // Select first few images
    var N = 3;
    var imageEntries = entries.toArray().filter(function (entry) {
      return entry.hasImage();
    }).slice(0, N);

    imageEntries.forEach(function (entry) {
      var id = entry.getId();
      var v = new ThumbnailView(entry);

      _thumbnailViewsMap[id] = v;

      $mount.append('<div id="thumbnail-' + id + '"></div>');
      v.bind($('#thumbnail-' + id));
    });

    _handleEntryCreated = function (ev) {
      // Create view and store it among others

      var newEntry = entries.getEntry(ev.data.entryId);

      if (newEntry.hasImage()) {
        var id = newEntry.getId();
        var v = new ThumbnailView(newEntry);
        _thumbnailViewsMap[id] = v;

        $mount.prepend('<div id="thumbnail-' + id + '"></div>');
        v.bind($('#thumbnail-' + id));
      }
    };

    _handleEntryRemoved = function (ev) {
      // Remove entry from _thumbnailViewsMap.
      var id = ev.data.entryId;

      if (id in _thumbnailViewsMap) {
        var v = _thumbnailViewsMap[id];
        delete _thumbnailViewsMap[id];

        // Remove entry's HTML and unbind view.
        v.unbind();
        $('#thumbnail-' + id).fadeOut('slow', function () {
          $('#thumbnail-' + id).remove();
        });
      }
    };

    entries.on('location_entry_created', _handleEntryCreated);
    entries.on('location_entry_removed', _handleEntryRemoved);
  };

  this.unbind = function () {

    // Unbind each child
    Object.keys(_thumbnailViewsMap).forEach(function (k) {
      _thumbnailViewsMap[k].unbind();
    });

    entries.off('location_entry_created', _handleEntryCreated);
    entries.off('location_entry_removed', _handleEntryRemoved);
  };
};

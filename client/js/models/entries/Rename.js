// Usage:
//   var c = new Rename(rawEntry, location)

var makeEntry = require('../lib/makeEntry');
var assertEntryType = require('../lib/assertEntryType');

module.exports = function (rawEntry, location) {
  // Parameters:
  //   rawEntry
  //     plain content entry object
  //   location
  //     models.Location instance. Work as a parent.

  assertEntryType(rawEntry.type, 'rename');

  makeEntry(this, rawEntry, location);

  this.getOldName = function () {
    return rawEntry.data.oldName;
  };

  this.getNewName = function () {
    return rawEntry.data.newName;
  };
};
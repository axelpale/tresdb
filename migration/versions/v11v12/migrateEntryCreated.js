// Migrate given location_entry_created
//
const db = require('georap-db');

module.exports = (crev, filepathToAttachments, entryTime, callback) => {
  // Parameters
  //   crev
  //     a v11 location_entry_created event
  //   filepathToAttachments
  //     a mapping from entry filepaths to attachment key arrays
  //   entryTime
  //     iso timestamp. Necessary to match original entry creation time
  //     which is usually a few milliseconds earlier than the event.
  //   callback
  //     function (err, newEvent) where newEvent in v12
  //

  let attachments = [];
  if (crev.data.filepath) {
    attachments = filepathToAttachments[crev.data.filepath];
  }

  const newEntry = {
    _id: crev.data.entryId,
    locationId: crev.locationId,
    time: entryTime,
    activeAt: entryTime,
    user: crev.user,
    deleted: false,
    published: false,
    markdown: crev.data.markdown === null ? '' : crev.data.markdown,
    attachments: attachments,
    comments: [],
    flags: crev.data.isVisit ? ['visit'] : [],
  };

  const newCrev = {
    _id: crev._id,
    locationId: crev.locationId,
    locationName: crev.locationName,
    time: crev.time,
    type: 'location_entry_created',
    user: crev.user,
    data: {
      entryId: crev.data.entryId,
      entry: newEntry,
    },
  };

  db.collection('events').replaceOne({
    _id: crev._id,
  }, newCrev, (repErr) => {
    if (repErr) {
      return callback(repErr);
    }

    return callback(null, newCrev);
  });
};

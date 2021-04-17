const db = require('tresdb-db');
const urls = require('georap-urls-server');
const proj = require('../../../../services/proj');
const eventsDal = require('../../../events/dal');
const entriesDal = require('../../../entries/dal');

module.exports = (id, callback) => {
  // Get single location with additional coordinate systems, events,
  // and entries and their attachments with full urls.
  //
  // Parameters:
  //   id
  //     ObjectId of location
  //   callback
  //     function (err, loc)
  //       err null and loc null if no loc found
  //
  db.collection('locations').aggregate([
    {
      $match: {
        _id: id,
      },
    },
    {
      $lookup: {
        from: 'attachments',
        localField: 'thumbnail',
        foreignField: 'key',
        as: 'thumbnail',
      },
    },
    // NOTE instead of unwind with preserveNullAndEmptyArrays:true
    // we unwind the thumbnail array afterwards.
  ]).toArray((err, locs) => {
    if (err) {
      return callback(err);
    }

    if (locs.length === 0) {
      return callback(null, null);
    }

    const loc = locs[0];

    if (!loc) {
      return callback(null, null);
    }

    eventsDal.getAllOfLocationComplete(id, (err2, evs) => {
      if (err2) {
        return callback(err2);
      }

      loc.events = evs;

      entriesDal.getAllOfLocationComplete(id, (err3, entries) => {
        if (err3) {
          return callback(err3);
        }

        loc.entries = entries;

        // Compute additional coodinate systems
        loc.altGeom = proj.getAltPositions(loc.geom.coordinates);

        // Complete thumbnail url
        // Also, unwind the lookup array.
        if (loc.thumbnail.length > 0) {
          loc.thumbnail = urls.completeAttachment(loc.thumbnail[0]);
        } else {
          loc.thumbnail = null;
        }

        return callback(null, loc);
      });
    });
  });
};
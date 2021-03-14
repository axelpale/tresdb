const db = require('tresdb-db');
const asyn = require('async');
const attachmentsDal = require('../../attachments/dal');
const lib = require('./lib');

module.exports = (params, callback) => {
  // Notify about changed entry
  //
  // Parameters:
  //   params:
  //     entryId
  //       string
  //     locationId
  //       string
  //     locationName
  //       string
  //     username
  //       string
  //     delta
  //       object of changed values
  //     original
  //       object of original values
  //
  if (typeof params.entryId !== 'object') {
    throw new Error('Invalid entry id type: ' + typeof params.entryId);
  }

  const newEvent = {
    type: 'location_entry_changed',
    user: params.username,
    time: db.timestamp(),
    locationId: params.locationId,
    locationName: params.locationName,
    data: {
      entryId: params.entryId,
      original: params.original,
      delta: params.delta,
    },
  };

  // Insert the basic version and emit an extended version
  // with complete attachments (if needed).
  lib.insertOne(newEvent, (err, newId) => {
    if (err) {
      return callback(err);
    }

    // Clone and fill id
    const eventForEmit = Object.assign({}, newEvent, {
      _id: newId,
    });

    // Complete attachments.
    // Convert attachment keys to attachments.
    // This prevents additional attachment requests from clients.
    asyn.waterfall([

      (next) => {
        const origAttachments = params.original.attachments;
        if (origAttachments) {
          attachmentsDal.getManyComplete(origAttachments, (merr, cats) => {
            if (merr) {
              return next(merr);
            }
            // Replace
            eventForEmit.data.original.attachments = cats;
            return next();
          });
        } else {
          return next();
        }
      },

      (next) => {
        const deltaAttachments = params.delta.attachments;
        if (deltaAttachments) {
          attachmentsDal.getManyComplete(deltaAttachments, (merr, cats) => {
            if (merr) {
              return next(merr);
            }
            // Replace
            eventForEmit.data.delta.attachments = cats;
            return next();
          });
        } else {
          return next();
        }
      },

    ], (finalErr) => {
      if (finalErr) {
        return callback(finalErr);
      }

      // Emit the extended version.
      lib.emitOne(eventForEmit);

      // TODO maybe callback earlier, place outside waterfall?
      return callback();
    });
  });
};

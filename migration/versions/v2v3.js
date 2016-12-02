var iter = require('../lib/iter');
var schema = require('../lib/schema');

var FROM_VERSION = 2;
var TO_VERSION = FROM_VERSION + 1;

exports.run = function (db, callback) {
  // Parameters
  //   db
  //     Monk db instance
  //   callback
  //     function (err)

  console.log();
  console.log('### Step v' + FROM_VERSION + ' to v' + TO_VERSION + ' ###');

  // 1. Schema version tag update
  console.log('Setting schema version tag...');

  var configColl = db.collection('config');

  schema.setVersion(configColl, TO_VERSION, function (err) {
    if (err) {
      return callback(err);
    }  // else

    console.log('Schema version tag created.');

    // 2. Transform locations to have locatorId instead of locator_id
    // and fields for tags, content, deleted, layer, and neighborsAvgDist
    console.log('Transforming locations to have new fields...');

    var locsColl = db.collection('locations');

    iter.updateEach(locsColl, function (loc, next) {

      loc.locatorId = loc.locator_id;
      delete loc.locator_id;

      loc.tags = [];
      loc.content = [];
      loc.deleted = false;
      loc.layer = 15;
      loc.neighborsAvgDist = 1000;

      return next(loc);
    }, function (err2) {

      if (err2) {
        return callback(err2);
      }  // else

      console.log('Locations successfully transformed.');

      console.log('### Step successful ###');

      return callback();
    });
  });
};

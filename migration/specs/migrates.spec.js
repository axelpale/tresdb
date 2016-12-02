/* global describe, it, beforeEach */
/* eslint-disable no-magic-numbers */

var local = require('../../config/local');
var migrates = require('../lib/migrates');
var schema = require('../lib/schema');
var fixtures = require('./fixtures');

// var should = require('should');
var assert = require('assert');
var monk = require('monk');
var tools = require('../../specs/tools');

var db = monk(local.mongo.testUrl);

var loadFixture = function (versionTag, callback) {
  // Load fixture into the database.
  //
  // Parameters:
  //   versionTag
  //     e.g. 'v2'
  //   callback
  //     function (err)
  //

  if (!fixtures.hasOwnProperty(versionTag)) {
    throw new Error('invalid version tag:' + versionTag);
  }

  tools.loadFixture(db, fixtures[versionTag], callback);
};


describe('migrates.migrate', function () {


  describe('v1 to v2', function () {

    beforeEach(function (done) {
      loadFixture('v1', done);
    });

    it('should be able to migrate from v1 to v2', function (done) {
      migrates.migrate({
        db: db,
        targetVersion: 2,
        callback: function (err) {
          assert.ifError(err);

          schema.getVersion(db.collection('config'), function (err2, vers) {
            assert.ifError(err2);
            assert.equal(vers, 2);
            done();
          });
        },
      });
    });

  });


  describe('v2 to v3', function () {

    beforeEach(function (done) {
      loadFixture('v2', done);
    });

    it('should be able to migrate from v2 to v3', function (done) {
      migrates.migrate({
        db: db,
        targetVersion: 3,
        callback: function (err) {
          assert.ifError(err);

          schema.getVersion(db.collection('config'), function (err2, vers) {
            assert.ifError(err2);
            assert.equal(vers, 3);
            done();
          });
        },
      });
    });

  });


});

/* eslint-disable new-cap */

var handlers = require('./handlers');
var express = require('express');
var router = express.Router();

// Locations
router.get('/', handlers.getRecent);

module.exports = router;
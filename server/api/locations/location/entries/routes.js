/* eslint-disable new-cap */

var express = require('express');
var router = express.Router();

var handlers = require('./handlers');
var entryIdParser = require('./lib/entryIdParser');
var jsonParser = require('body-parser').json();

router.post('/', handlers.create); // uses multer body-parser internally

router.use('/:entryId', entryIdParser);

//router.post('/:entryId', jsonParser, handlers.change);
router.delete('/:entryId', jsonParser, handlers.remove);

module.exports = router;

const pjson = require('../../package.json');
const config = require('tresdb-config');
const ejs = require('ejs');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

// Precompile template and prerender index.html.
// Include config and other variables for the client.
const indexHtml = (function precompile() {

  const p = path.resolve(__dirname, './template.ejs');
  const f = fs.readFileSync(p, 'utf8');  // eslint-disable-line no-sync
  const template = ejs.compile(f);

  const tresdb = {
    version: pjson.version,
    config: {
      title: config.title,
      description: config.description,
      defaultMapState: config.defaultMapState,
      supportButtonTitle: config.supportButtonTitle,
      supportPageContent: config.supportPageContent,
      features: config.features,
      googleMapsKey: config.googleMapsKey,
      staticUrl: config.staticUrl,
      uploadUrl: config.uploadUrl,
      uploadSizeLimit: config.uploadSizeLimit,
      tempUploadSizeLimit: config.tempUploadSizeLimit,
      locationStatuses: config.locationStatuses,
      locationTypes: config.locationTypes,
      rewards: config.rewards,
      entryFlags: config.entryFlags,
      markerTemplates: config.markerTemplates,
      comments: config.comments,
      coordinateSystems: config.coordinateSystems,
      exportServices: config.exportServices,
    },
  };

  // Precompile client-side templates and append their source into HTML.
  const precompiledTemplates = [];

  config.coordinateSystems.forEach((sys) => {
    const sysName = sys[0];
    const sysTemplate = sys[2];
    const sysSource = _.template(sysTemplate).source;

    precompiledTemplates.push({
      name: sysName,
      source: sysSource,
    });
  });

  config.exportServices.forEach((serv) => {
    const servName = serv[0];
    const servTemplate = serv[1];
    const servSource = _.template(servTemplate).source;

    precompiledTemplates.push({
      name: servName,
      source: servSource,
    });
  });

  return template({
    tresdb: tresdb,
    templates: precompiledTemplates,
  });
}());


exports.get = function (req, res) {
  return res.send(indexHtml);
};

exports.getManifest = function (req, res) {
  return res.json({
    'background_color': 'black',
    'description': config.description,
    'display': 'standalone',
    'icons': [
      {
        'src': 'assets/images/logo/64.png',
        'sizes': '64x64',
        'type': 'image/png',
      },
      {
        'src': 'assets/images/logo/128.png',
        'sizes': '128x128',
        'type': 'image/png',
      },
      {
        'src': 'assets/images/logo/256.png',
        'sizes': '256x256',
        'type': 'image/png',
      },
    ],
    'name': config.title,
    'start_url': '.',
  });
};

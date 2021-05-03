/* eslint-disable no-sync, max-lines */

const config = require('georap-config');
const db = require('georap-db');
const bcrypt = require('bcryptjs');

const admin = config.admin.username;

module.exports = {
  collections: {
    config: [
      {
        key: 'schemaVersion',
        value: 12,
      },
    ],
    attachments: [],
    entries: [],
    events: [],
    locations: [],
    users: [
      {
        admin: true,
        email: config.admin.email,
        hash: bcrypt.hashSync(config.admin.password, config.bcrypt.rounds),
        name: admin,
        points: 0, // points are updated by worker
        // points7days: created by worker
        // points30days: created by worker
        // points365days: created by worker
        status: 'active',
        createdAt: db.timestamp(),
        loginAt: db.timestamp(),
      },
    ],
  },
  indices: db.INDICES,
};

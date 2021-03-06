// Component to switch tabs.
//
var template = require('./template.ejs');
var emitter = require('component-emitter');

// Remember which tab was open
var defaultTabHash = 'activity';

var loadTabHash = function () {
  var hash = window.localStorage.getItem('georap-tab');
  if (hash) {
    return hash;
  }
  return defaultTabHash;
};
var saveTabHash = function (hash) {
  window.localStorage.setItem('georap-tab', hash);
};

module.exports = function () {
  // Init

  var self = this;
  emitter(self);
  var $mount = null;

  // mapping: tab hash to tab class
  var tabs = {
    activity: 'activity',
    locations: 'locations',
    posts: 'posts',
  };

  // Public methods

  this.bind = function ($mountEl) {
    $mount = $mountEl;
    $mount.html(template({
      tabs: tabs,
    }));

    // Make current tab active
    var tabClass = tabs[loadTabHash()];
    $mount.find('.latest-tab-' + tabClass).addClass('active');

    // Click tab to change tab
    var tabSwitcher = function (tabHash) {
      return function (ev) { // receives click ev
        // No link navigation needed.
        ev.preventDefault();
        // Display active tab
        $mount.find('li').removeClass('active');
        $mount.find('.latest-tab-' + tabs[tabHash]).addClass('active');
        // Remember the tab for next time Tabs is bound.
        saveTabHash(tabHash);
        // Inform about tab switch
        self.emit('tab_switch', tabHash);
      };
    };
    Object.keys(tabs).forEach(function (tabHash) {
      $mount.find('.latest-tab-' + tabs[tabHash]).click(tabSwitcher(tabHash));
    });
  };

  this.getTabHash = function () {
    return loadTabHash();
  };

  this.unbind = function () {
    $mount = null;
  };
};

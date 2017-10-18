
var template = require('./template.ejs');
var detailsTemplate = require('./details.ejs');
var emitter = require('component-emitter');

module.exports = function () {
  // Parameters
  //

  // Init
  var self = this;
  emitter(self);

  this.state = {
    locs: [],
  };
  this.$mount = null;

  // Public methods

  this.getSelectedIndices = function () {
    var $boxes = $('#tresdb-batch-list tbody input[name="row-check"]:checked');
    var vals = $boxes.map(function () {
      return parseInt(this.value, 10);
    });
    return vals;
  };

  this.countSelected = function () {
    var $boxes = $('#tresdb-batch-list tbody input[name="row-check"]:checked');
    return $boxes.length;
  };

  this.countLocations = function () {
    return this.state.locs.length;
  };

  this.setState = function (newState) {

    if (typeof newState === 'function') {
      self.state = newState(self.state);
    } else {
      self.state = newState;
    }

    if (self.$mount) {
      self.unbind();
      self.bind(self.$mount);
    }

    self.emit('changed');
  };

  this.bind = function ($mount) {
    self.$mount = $mount;

    $mount.html(template(self.state));

    var $checkAllBox = $('#tresdb-batch-select-all');
    var $list = $('#tresdb-batch-list');

    $checkAllBox.change(function () {
      var $rows = $('#tresdb-batch-list .tresdb-batch-row-check');
      $rows.prop('checked', this.checked);
    });

    $list.on('click', '.tresdb-batch-view-details', function (ev) {
      ev.preventDefault();
      // plain stopPropagation fires the event twice
      ev.stopImmediatePropagation();

      var $tr = $(ev.target).parent().parent();
      var index = parseInt(ev.target.dataset.index, 10);
      var isopen = parseInt(ev.target.dataset.isopen, 10);
      var loc = self.state.locs[index];

      if (isopen === 1) {
        $tr.next().remove();
        ev.target.dataset.isopen = 0;
      } else {
        $tr.after(detailsTemplate(loc));
        ev.target.dataset.isopen = 1;
      }
    });

    $list.on('click', 'td.tresdb-batch-name', function (ev) {
      ev.preventDefault();
      ev.stopImmediatePropagation();

      //var index = parseInt($(ev.target).parent().data('input'), 10);
      var $tr = $(ev.target).parent();
      var $box = $tr.find('.tresdb-batch-row-check');
      $box.prop('checked', !$box.prop('checked'));
      $box.change(); // emit change
    })

    $list.on('change', '.tresdb-batch-row-check', function (ev) {
      ev.preventDefault();
      ev.stopImmediatePropagation();

      self.emit('changed');
    });
  };

  this.unbind = function () {
    $('#tresdb-batch-select-all').off();
    $('#tresdb-batch-list').off();
  };

};

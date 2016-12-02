// Usage:
//   var s = new Story(api, auth);
//   s.render(node);
//   s.bind();

var marked = require('marked');
var timestamp = require('./lib/timestamp');
var storyTemplate = require('../../templates/entries/story.ejs');
var markdownSyntax = require('../../templates/markdownSyntax.ejs');

module.exports = function (entryModel, accountModel, api) {

  // Private methods

  var onEdit = function (id, clickHandler) {
    var q = '#' + id + '-edit';
    $(q).click(function (ev) {
      ev.preventDefault();
      clickHandler();
    });
  };

  var isFormOpen = function (id) {
    var isHidden = $('#' + id + '-form-container').hasClass('hidden');
    return !isHidden;
  };

  var openForm = function (id) {
    $('#' + id + '-body').addClass('hidden');
    $('#' + id + '-form-container').removeClass('hidden');
  };

  var prefillTextarea = function (id, content) {
    var textarea = $('#' + id + '-input');
    textarea.val(content);
    // Resize to content. See http://stackoverflow.com/a/13085420/638546
    textarea.height(textarea[0].scrollHeight);
  };

  var closeForm = function (id) {
    $('#' + id + '-form-container').addClass('hidden');
    $('#' + id + '-body').removeClass('hidden');
  };


  // Public methods

  this.render = function () {
    return storyTemplate({
      entry: entryModel,
      marked: marked,  // markdown parser
      timestamp: timestamp,
      account: accountModel,
      markdownSyntax: markdownSyntax,
    });
  };

  this.bind = function () {

    var id = entryModel.getId();

    // If own story, display form
    if (entry.getUserName() === account.getName()) {
      // allow reveal of the edit form
      onEdit(id, function () {
        if (isFormOpen(id)) {
          closeForm(id);
        } else {
          console.log('fooo');
          openForm(id);
          prefillTextarea(id, entry.data.markdown);
        }
      });
    }

  };

};

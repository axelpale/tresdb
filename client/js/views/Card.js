
var cardTemplate = require('../../templates/card.ejs');

module.exports = function (onUserClose) {

  // Constants
  var cardLayer = document.getElementById('card-layer');
  var self = this;

  // State
  var activeView = null;

  // Private methods

  var fillCardLayer = function (content) {
    // Parameters:
    //   content
    //     string
    //       html content.
    cardLayer.innerHTML = content;
  };

  var clearCardLayer = function () {
    // Note: innerHTML = '' is a slow method to do the same.
    // See http://stackoverflow.com/a/3450726/638546
    while (cardLayer.firstChild) {
      cardLayer.removeChild(cardLayer.firstChild);
    }
  };

  // Public methods

  this.open = function (view, cardClass) {
    // Open a card over the map and close any other open cards.
    //
    // Parameters:
    //   view
    //     to be rendered inside the card
    //   cardClass
    //     string, optional. Card type. Available types:
    //       page (default)
    //         A fraction of the map is visible.
    //       full
    //         Fills the map area completely.
    var card, cardType;

    // Handle default parameters
    if (typeof cardClass === 'undefined') {
      cardType = 'page';
    } else {
      cardType = cardClass;
    }

    // Create card
    card = cardTemplate({
      content: view.render(),
      cardClass: cardType,
    });

    // Remove possible other cards
    if (activeView !== null) {
      activeView.unbind();
    }
    activeView = view;
    fillCardLayer(card);

    // Display if hidden
    cardLayer.style.display = 'block';  // from 'none' if hidden

    // Activate input bindings
    view.bind();

    // Initialize close mechanism
    if (cardType === 'page') {
      $('#card-background').click(function () {
        self.close();

        return onUserClose();
      });
    }
  };

  this.close = function () {
    cardLayer.style.display = 'none';
    // Remove possible cards
    if (activeView !== null) {
      activeView.unbind();
    }
    activeView = null;
    clearCardLayer();
  };

};
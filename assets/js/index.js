var map;

/*
var openCard = function () {
  // Open new hovering window
};*/

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 61.498151, lng: 23.761025},
    zoom: 8
  });


  (function initMapMenu() {
    // Main menu
    var menuDiv = document.createElement('div');
    menuDiv.className = 'tresdb-map-menu';

    /*var newsUI = document.createElement('img');
    newsUI.src = 'images/icons/Messaging-Appointment-Reminders-icon.png';
    menuDiv.appendChild(newsUI);

    var listUI = document.createElement('img');
    listUI.src = 'images/icons/Data-List-icon.png';
    menuDiv.appendChild(listUI);

    var addUI = document.createElement('img');
    addUI.src = 'images/icons/City-Hospital-icon.png';
    menuDiv.appendChild(addUI);

    var userUI = document.createElement('img');
    userUI.src = 'images/icons/Users-Name-icon.png';
    menuDiv.appendChild(userUI);*/

    (function defineAddButton() {

      var addUI = document.createElement('div');
      addUI.className = 'tresdb-map-menu-button-ui';

      var addText = document.createElement('div');
      addText.className = 'tresdb-map-menu-button-text';

      addText.innerHTML = 'Add';
      addUI.appendChild(addText);

      addUI.addEventListener('click', function () {
        var m = new google.maps.Marker({
          position: map.getCenter(),
          title: 'New location',
          draggable: true,
          animation: google.maps.Animation.DROP
        });
        m.setMap(map);
      });

      menuDiv.appendChild(addUI);
    }());

    (function defineSearchButton() {

      var searchUI = document.createElement('div');
      searchUI.className = 'tresdb-map-menu-button-ui';

      var searchText = document.createElement('div');
      searchText.className = 'tresdb-map-menu-button-text';

      searchText.innerHTML = 'Search';
      searchUI.appendChild(searchText);

      searchUI.addEventListener('click', function () {
        // Open a card over the map.
        var cardContainer = document.getElementById('card-container');
        cardContainer.style.display = 'block';  // from 'none'

        // Render with a precompiled template provided by Sails.
        var cardInner = window.JST['assets/templates/card.ejs']({
          message: 'Hello'
        });

        var card = document.createElement('div');
        card.innerHTML = cardInner;
        cardContainer.appendChild(card);
      });

      menuDiv.appendChild(searchUI);

    }());

    map.controls[google.maps.ControlPosition.TOP_CENTER].push(menuDiv);

  }());
}

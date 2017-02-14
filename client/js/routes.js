
// Client-side routing

var queryString = require('query-string');

var locations = require('./stores/locations');
var account = require('./stores/account');
var events = require('./stores/events');

var CardView = require('./views/Card');

var LoginView = require('./views/Login');
var SignupView = require('./views/Signup');
var InviteView = require('./views/Invite');
var EventsView = require('./views/Events');
var LoadingView = require('./views/Loading');
var LocationView = require('./views/Location');
var UsersView = require('./views/Users');
var UserView = require('./views/User');
var Error404View = require('./views/Error404');
var ResetPasswordView = require('./views/ResetPassword');
var ChangePasswordView = require('./views/ChangePassword');

var AfterLogin = require('./models/AfterLogin');

exports.route = function (page) {

  // Init

  // A card is used to display content.
  var card = new CardView();
  card.on('closed', function () {
    page('/');
  });
  // Handle paths where to redirect after login.
  var afterLogin = new AfterLogin();

  // Public routes first.

  page('*', function parseQueryString(context, next) {
    // Note: context.query does not have prototype. Bastard.
    var q = queryString.parse(context.querystring);

    // If querystring is empty, parse returns an object without properties.
    // Tested it.
    context.query = q;

    return next();
  });

  page('/login', function () {
    // Logout should be immediate; no reason to show progress bar.
    account.logout(function () {
      var view = new LoginView(function onSuccess() {
        // After successful login, go to original path.
        page.show(afterLogin.get());
        // Reset for another login during the same session.
        afterLogin.reset();
      });
      card.open(view, 'full');
    });
  });

  page('/reset/:token', function (context) {
    var token = context.params.token;
    var view = new ResetPasswordView(token, function success() {
      page.show('/login');
    });
    card.open(view, 'full');
  });

  page('/signup/:token', function (context) {
    var token = context.params.token;
    var view = new SignupView(token, function success() {
      page.show('/login');
    });
    card.open(view, 'full');
  });

  // Backwards compatiblity with v1 invite URLs
  page('*', function (context, next) {
    var q = context.query;

    if ('invite' in q) {
      return page.show('/signup/' + q.invite);
    }  // else

    if ('reset' in q) {
      return page.show('/reset/' + q.reset);
    }  // else

    return next();
  });

  // Routes that require login

  page('*', function (context, next) {
    //   If not logged in then show login form.

    if (account.isLoggedIn()) {
      return next();
    }

    // Remember original requested path and redirect to it after login
    afterLogin.set(context);

    page.show('/login');
  });

  page('/', function () {
    // Map is always open on the background.
    // Infinite loop prevention:
    //   Do not emit 'closed' event because it causes redirection to '/'
    var silent = true;
    card.close(silent);
  });

  page('/password', function () {
    var view = new ChangePasswordView();
    card.open(view, 'page');
  });

  page('/invite', function () {
    var view = new InviteView();
    card.open(view, 'page');
  });

  page('/latest', function () {

    // Open a loading card
    var loadingView = new LoadingView();

    card.open(loadingView, 'page');

    // Fetch events before rendering.
    events.getRecent(0, function (err, rawEvents) {
      if (err) {
        console.error(err);
        return;
      }

      // Render & bind
      var view = new EventsView(rawEvents);
      card.open(view);
    });
  });

  page('/locations/:id', function (ctx) {

    // Open a loading card
    var loadingView = new LoadingView();

    card.open(loadingView, 'page');

    // Fetch location before rendering.
    locations.get(ctx.params.id, function (err, loc) {
      if (err) {
        console.error(err);
        return;
      }

      // Render location card.
      var view = new LocationView(loc);
      card.open(view);
    });
  });

  page('/users', function () {
    var view = new UsersView();
    card.open(view);
  });

  page('/users/:username', function (ctx) {
    var view = new UserView(ctx.params.username);
    card.open(view);
  });

  page('*', function () {
    // Page not found.
    var view = new Error404View();
    card.open(view, 'page');
  });

};

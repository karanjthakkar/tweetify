var TokenController = require('./controllers/token'),
  OptionController = require('./controllers/option');
  UserController = require('./controllers/user');

/**
 * Application routes
 */
module.exports = function(app, passport) {

  //Landing page
  app.get('/', function(req, res) {
    res.render('login');
  });

  //Post Login Application page
  app.get('/account', ensureAuthenticated, function(req, res) {
    res.render('account', {
      user: req.user
    });
  });

  // GET /auth/twitter
  // Use passport.authenticate() as route middleware to authenticate the
  // request.  The first step in Twitter authentication will involve redirecting
  // the user to twitter.com.  After authorization, the Twitter will redirect
  // the user back to this application at /auth/twitter/callback
  app.get('/auth/twitter', passport.authenticate('twitter', { forceLogin: true }));

  // GET /auth/twitter/callback
  // Use passport.authenticate() as route middleware to authenticate the
  // request.  If authentication fails, the user will be redirected back to the
  // login page.  Otherwise, the primary route function function will be called,
  // which, in this example, will redirect the user to the home page.
  app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
      failureRedirect: '/'
    }),
    function(req, res) {
      res.redirect('//localhost:4200/?code=' + req.user.id);
    });

  app.post('/logout', function(req, res) {
    req.logout();
    res.status(200).json({
      message: 'Successfully logged out'
    })
  });

  /* Client Side API's */

  //Get user profile
  app.get('/users/:id', UserController.getUserData);

  //Get and Save/Update Application Tokens
  app.get('/application_tokens', TokenController.getApplicationToken);
  app.post('/application_tokens', TokenController.saveApplicationToken);

  //Check if a username is valid
  app.get('/check_username', OptionController.checkUsername);

  //Get and Save/Update Favorite Users
  app.get('/fav_users', OptionController.getFavoriteUsers);
  app.post('/fav_users', OptionController.saveFavoriteUsers);

  //Get and Save/Update Tweet Options
  app.get('/tweet_options', OptionController.getTweetOptions);
  app.post('/tweet_options', OptionController.saveTweetOptions);

  //Get and Save/Update Favorite Keywords
  app.get('/fav_keywords', OptionController.getKeywords);
  app.post('/fav_keywords', OptionController.saveKeywords);

  //Fetch tweets for a user
  app.get('/posted_tweets', UserController.getPostedTweets);
  app.get('/scheduled_tweets', UserController.getScheduledTweets);

  //Turn posting ON and OFF
  app.get('/activity', OptionController.getAccountActivity);
  app.post('/activity', OptionController.saveAccountActivity);

};

// Simple route middleware to ensure user is authenticated.
// Use this route middleware on any resource that needs to be protected.  If
// the request is authenticated (typically via a persistent login session),
// the request will proceed.  Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

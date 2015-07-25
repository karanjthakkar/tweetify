var fs = require('fs'),
  path = require('path'),
  express = require('express'),
  passport = require('passport'),
  TwitterStrategy = require('passport-twitter').Strategy,
  session = require('express-session'),
  argv = require('minimist')(process.argv.slice(2)),
  config = require('./config'),
  mongoose = require('mongoose'),
  MongoStore = require('connect-mongo')(session);

//Setup config based on environment
config = (argv['environment'] === 'prod' ? config.prod : config.test);

//initiate DB connection using mongoose
mongoose.connect(config.dbUrl);

// Bootstrap models
var modelsPath = path.join(__dirname, 'models');
fs.readdirSync(modelsPath).forEach(function (file) {
  console.log(file);
  require(modelsPath + '/' + file);
});

var UserController = require('./controllers/user');

// Passport session setup.
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.  However, since this example does not
// have a database of user records, the complete Twitter profile is serialized
// and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the TwitterStrategy within Passport.
// Strategies in passport require a `verify` function, which accept
// credentials (in this case, a token, tokenSecret, and Twitter profile), and
// invoke a callback with a user object.
passport.use(new TwitterStrategy({
    consumerKey: config.TWITTER_CONSUMER_KEY,
    consumerSecret: config.TWITTER_CONSUMER_SECRET,
    callbackURL: config.callbackURL
  },
  function(token, tokenSecret, profile, done) {
    var user = {
      id: profile._json.id,
      description: profile._json.description,
      username: profile._json.screen_name,
      followers: profile._json.followers_count,
      following: profile._json.friends_count,
      favorites: profile._json.favourites_count,
      statuses: profile._json.statuses_count,
      lists: profile._json.listed_count,
      profile_image_url: profile._json.profile_image_url_https || profile._json.profile_image_url,
      profile_banner_url: profile._json.profile_banner_url,
      twitter_token: token,
      twitter_token_secret: tokenSecret,
      access_level: profile._accessLevel
    };
    UserController.saveOrUpdateUserData(user, done);
  }
));


var app = express();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({
    secret: 'keyboard cat',
    maxAge: new Date(Date.now() + 3600000),
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    })
  }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


app.get('/', function(req, res) {
  if (req.user) {
    res.redirect('/account');
  } else {
    res.render('login', {
      user: req.user
    });
  }
});

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
app.get('/auth/twitter', passport.authenticate('twitter'));

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
    res.redirect('/account');
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.listen(3000);


// Simple route middleware to ensure user is authenticated.
// Use this route middleware on any resource that needs to be protected.  If
// the request is authenticated (typically via a persistent login session),
// the request will proceed.  Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/')
}

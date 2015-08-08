var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Twit = require('twit');

//TODO: Validate data received from frontend. Check keys
exports.getApplicationToken = function(req, res) {
  if(req.isAuthenticated()) {
    User.findOne({
      id: req.user.id
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          message: 'There was an error finding your records'
        });
      } else if (user.application_token_expired) {
        var error = {
          success: false,
          message: 'You have not entered your application access token or your token has expired.'
        };
        res.status(401).json(error);
      } else {
        var data = {
          twitter_app_consumer_key: user.twitter_app_consumer_key,
          twitter_app_consumer_secret: user.twitter_app_consumer_secret,
          twitter_app_access_token: user.twitter_app_access_token,
          twitter_app_access_token_secret: user.twitter_app_access_token_secret
        };
        res.status(200).json(data);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res)
  }
}

exports.saveApplicationToken = function(req, res) {
  if(req.isAuthenticated()) {
    if (req.body.twitter_app_consumer_key && req.body.twitter_app_consumer_secret && req.body.twitter_app_access_token && req.body.twitter_app_access_token_secret) {

      var tokens = {
        twitter_app_consumer_key: req.body.twitter_app_consumer_key,
        twitter_app_consumer_secret: req.body.twitter_app_consumer_secret,
        twitter_app_access_token: req.body.twitter_app_access_token,
        twitter_app_access_token_secret: req.body.twitter_app_access_token_secret
      };

      //Check if the tokens supplied are authentic or not
      verifyCredentials(tokens, function(err, user) {
        if (err) {
          var error = {
            success: false,
            message: 'Invalid or expired access tokens'
          };
          return res.status(401).json(error);
        } else {
          User.findOne({
            id: req.user.id
          }, function(err, user) {
            if (err) {
              res.status(500).json({
                message: 'There was an error finding your records'
              });
            } else {
              user.twitter_app_consumer_key = req.body.twitter_app_consumer_key;
              user.twitter_app_consumer_secret = req.body.twitter_app_consumer_secret;
              user.twitter_app_access_token = req.body.twitter_app_access_token;
              user.twitter_app_access_token_secret = req.body.twitter_app_access_token_secret;
              user.application_token_expired = false;
              user.last_access_date = Date.now();
              user.save(function(err, user) {
                if (err) {
                  res.status(500).json({
                    message: 'There was an error saving your application keys'
                  });
                } else {
                  res.status(200).json();
                }
              });
            }
          });
        }
      });
    } else {
      res.status(401).json({
        message: 'Please provide all the keys'
      });
    }
  } else {
    respondToUnauthenticatedRequests(res);
  }
}

function respondToUnauthenticatedRequests(res) {
  res.status(403).json({
    message: 'You are not logged in. Please login to continue'
  });
}

function verifyCredentials(tokens, callback) {
  var T = new Twit({
    consumer_key: tokens.twitter_app_consumer_key,
    consumer_secret: tokens.twitter_app_consumer_secret,
    access_token: tokens.twitter_app_access_token,
    access_token_secret: tokens.twitter_app_access_token_secret
  });
  T.get('account/verify_credentials', function(err, user) {
    callback(err, user);
  });
}

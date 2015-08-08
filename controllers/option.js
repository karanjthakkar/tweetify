var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  _ = require('lodash'),
  Twit = require('twit'),
  Constants = {
    MINIMUM_FAV_USERS: 5,
    MINIMUM_FAV_KEYWORDS: 10
  };

//TODO: If old keyword has a saved date, it needs to be maintained on update IMPORTANT
//TODO: Validate data received from frontend. Check keys
exports.getFavoriteUsers = function(req, res) {
  getDataForKey(req, res, 'fav_users');
};

exports.saveFavoriteUsers = function(req, res) {
  saveDataForKey(req, res, 'fav_users');
};

exports.getKeywords = function(req, res) {
  getDataForKey(req, res, 'fav_keywords');
};

exports.saveKeywords = function(req, res) {
  saveDataForKey(req, res, 'fav_keywords');
};

exports.checkUsername = function(req, res) {
  if (req.isAuthenticated()) {
    var userId = req.user.id;
    User.findOne({
      id: userId
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
        T = new Twit({
          consumer_key: user.twitter_app_consumer_key,
          consumer_secret: user.twitter_app_consumer_secret,
          access_token: user.twitter_app_access_token,
          access_token_secret: user.twitter_app_access_token_secret
        });
        T.get('users/show', {
          screen_name: req.query.username
        }, function(err, user) {
          if (err) {
            var message = err.code === 63 ? err.message : 'User does not exist.'
            return res.status(401).json({
              success: false,
              message: message
            });
          } else {
            return res.status(200).json();
          }
        })
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
}

function getDataForKey(req, res, key) {
  if (req.isAuthenticated()) {
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
        var data = user[key];
        res.status(200).json(data);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res)
  }
}

function saveDataForKey(req, res, key) {
  if (req.isAuthenticated()) {
    var favData = JSON.parse(req.body[key]),
      minKey = 'MINIMUM_' + key.toUpperCase();

    //Make all username lowercase
    favItems = favData.map(function(item) {
      return item.toLowerCase();
    });

    uniqueFavData = _.uniq(favData);

    if (uniqueFavData.length !== favData.length) {
      return res.status(401).json({
        message: 'Please provide ' + Constants[minKey] + ' unique values'
      });
    }

    if (_.isArray(uniqueFavData) && !_.isEmpty(uniqueFavData) && uniqueFavData.length >= Constants[minKey]) {
      User.findOne({
        id: req.user.id
      }, function(err, user) {
        if (err) {
          res.status(500).json({
            message: 'There was an error finding your records'
          });
        } else {
          var itemKey = (key === 'fav_users' ? 'username' : 'keyword');
          user[key] = uniqueFavData.map(function(item) {
            var returnObject = {};
            returnObject[itemKey] = item;
            return returnObject;
          });
          user.last_access_date = Date.now();
          user.save(function(err, user) {
            if (err) {
              res.status(500).json({
                message: 'There was an error saving your favorite values'
              });
            } else {
              res.status(200).json();
            }
          });
        }
      });
    } else {
      res.status(401).json({
        message: 'Please provide atleast ' + Constants[minKey] + ' values for finding better content'
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

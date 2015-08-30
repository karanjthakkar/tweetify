var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  _ = require('lodash'),
  Twit = require('twit'),
  Constants = require('../constants');

//TODO: If old keyword has a saved date, it needs to be maintained on update IMPORTANT
//TODO: Validate data received from frontend. Check keys
exports.getFavoriteUsers = function(req, res) {
  getFavDataForKey(req, res, 'fav_users');
};

exports.saveFavoriteUsers = function(req, res) {
  saveFavDataForKey(req, res, 'fav_users');
};

exports.getKeywords = function(req, res) {
  getFavDataForKey(req, res, 'fav_keywords');
};

exports.saveKeywords = function(req, res) {
  saveFavDataForKey(req, res, 'fav_keywords');
};

exports.getTweetOptions = function(req, res) {
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
        var data = user['tweet_action'];
        res.status(200).json(data);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res)
  }
};

exports.saveTweetOptions = function(req, res) {
  if (req.isAuthenticated()) {

    var option = req.body['tweet_action'];

    if (['COPY', 'NATIVE_RT', 'TEXT_RT', 'QUOTE'].indexOf(option) === -1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid tweet option'
      });
    }

    User.findOne({
      id: req.user.id
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          message: 'There was an error finding your records'
        });
      } else {
        user.tweet_action = req.body['tweet_action'];
        user.last_access_date = Date.now();
        user.onboard_tweet_action = true;
        user.save(function(err, user) {
          if (err) {
            res.status(500).json({
              message: 'There was an error saving your favorite values'
            });
          } else {
            res.status(200).json({
              success: true
            });
          }
        });
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
};

exports.getAccountActivity = function(req, res) {
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
        var data = user['activity'];
        res.status(200).json(data);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res)
  }
};

exports.saveAccountActivity = function(req, res) {
  if (req.isAuthenticated()) {

    var option = req.body['activity'];

    if (['ON', 'OFF'].indexOf(option) === -1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid activity'
      });
    }

    User.findOne({
      id: req.user.id
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          message: 'There was an error finding your records'
        });
      } else {
        user.activity = req.body['activity'];
        user.last_access_date = Date.now();
        user.save(function(err, user) {
          if (err) {
            res.status(500).json({
              message: 'There was an error saving your favorite values'
            });
          } else {
            res.status(200).json({
              success: true
            });
          }
        });
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
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
            return res.status(404).json({
              success: false,
              message: message
            });
          } else {
            var userObject = {
              profile_image_url: user.profile_image_url,
              username: user.screen_name,
              name: user.name
            };
            return res.status(200).json({
              success: true,
              user: userObject
            });
          }
        })
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
}

function getFavDataForKey(req, res, key) {
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

function saveFavDataForKey(req, res, key) {
  if (req.isAuthenticated()) {
    var params = req.body[key],
      user = req.user,
      minKey = 'MINIMUM_' + key.toUpperCase() + '_' + user.user_type,
      maxKey = 'MAXIMUM_' + key.toUpperCase() + '_' + user.user_type,
      favData;

    if (!params) {
      return res.status(401).json({
        message: 'Please provide ' + Constants[minKey] + ' unique values'
      });
    }

    favData = req.body[key];

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

    if (_.isArray(uniqueFavData) && !_.isEmpty(uniqueFavData) && uniqueFavData.length >= Constants[minKey] && uniqueFavData.length <= Constants[maxKey]) {
      User.findOne({
        id: req.user.id
      }, function(err, user) {
        if (err) {
          res.status(500).json({
            message: 'There was an error finding your records'
          });
        } else {
          var itemKey = (key === 'fav_users' ? 'username' : 'keyword'),
            oldList = user[key],
            newList = uniqueFavData;

          /*
           *  This compares the new list from client with the old list
           *  from db. It keeps items that overlap (preferring db copy)
           *  else it adds the item from the new list to it
           */
          user[key] = _.map(newList, function(newUser) {
            var isAlreadyPresentInOldList = _.find(oldList, function(prevUser) {
              return new RegExp(newUser, 'gi').test(prevUser.username)
            });
            var newUserObj = {};
            newUserObj[itemKey] = newUser;
            return isAlreadyPresentInOldList || newUserObj;
          });

          user.last_access_date = Date.now();

          //Save onbaording status
          user['onboard_' + key] = true;

          user.save(function(err, user) {
            if (err) {
              res.status(500).json({
                message: 'There was an error saving your favorite values'
              });
            } else {
              res.status(200).json({
                success: true
              });
            }
          });
        }
      });
    } else if (uniqueFavData.length < Constants[minKey]) {
      res.status(400).json({
        message: 'Please provide atleast ' + Constants[minKey] + ' values for finding better content'
      });
    } else {
      res.status(400).json({
        message: 'You can add a maximum of ' + Constants[maxKey] + ' values.'
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

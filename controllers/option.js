var mongoose = require('mongoose'),
  User = mongoose.model('User'),
  _ = require('lodash');

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

function getDataForKey(req, res, key) {
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
        var data = user[key];
        res.status(200).json(data);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res)
  }
}

function saveDataForKey(req, res, key) {
  if(req.isAuthenticated()) {
    var favData = JSON.parse(req.body[key]);

    //Make all username lowercase
    favItems = favData.map(function(item) {
      return item.toLowerCase();
    });

    uniqueFavData = _.uniq(favData);

    if (uniqueFavData.length !== favData.length) {
      return res.status(401).json({
        message: 'Please provide 10 unique values'
      });
    }

    if (_.isArray(uniqueFavData) && !_.isEmpty(uniqueFavData) && uniqueFavData.length >= 10) {
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
        message: 'Please provide atleast 10 values for finding better content'
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

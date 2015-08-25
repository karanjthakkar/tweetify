var mongoose = require('mongoose'),
  _ = require('lodash'),
  User = mongoose.model('User');

exports.saveOrUpdateUserData = function(userData, done) {

  var user;

  //Update or add new user to collection
  User.findOne({
    id: userData.id
  }, function(err, user) {
    if (err) {
      return done(err); //If some error, return it
    } else {
      if (!user) { //Check if user is present in db. If not, create a new user
        var now = Date.now();
        userData = _.extend(userData, {
          last_cron_run_time: now,
          created_at: now,
          last_access_date: now
        });
        user = new User(userData);
      } else { //Else update existing user
        _.forOwn(userData, function(value, key) {
          user[key] = userData[key];
        });
        user.last_access_date = Date.now();
      }
      user.save(function(err, user) {
        done(err, {
          id: user.id,
          username: user.username,
          user_type: user.user_type
        });
      });
    }
  });

};

exports.getUserData = function(req, res) {
  var userId = parseInt(req.params.id);
  if(req.user && req.user.id !== userId) {
    return res.status(403).json({
      message: 'You are not authorized to view this'
    });
  }
  if (req.isAuthenticated()) {
    var userId = req.user.id;

    //Update or add new user to collection
    User.findOne({
      id: userId
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          message: 'There was an error finding your records'
        });
      } else {
        return res.status(200).json(user);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
};

exports.getPostedTweets = function(req, res) {
  getTweets(req, res, true);
};

exports.getScheduledTweets = function(req, res) {
  getTweets(req, res, false);
};

function getTweets(req, res, posted) {
  if (req.isAuthenticated()) {
    var userId = req.user.id;

    //Update or add new user to collection
    User.findOne({
      id: userId
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          message: 'There was an error finding your records'
        });
      } else {
        var data = _.filter(user.top_tweets, function(item) {
          return item.posted === posted;
        });
        return res.status(200).json(data);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
}

function respondToUnauthenticatedRequests(res) {
  res.status(403).json({
    message: 'You are not logged in. Please login to continue'
  });
}

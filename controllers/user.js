var mongoose = require('mongoose'),
  _ = require('lodash'),
  moment = require('moment'),
  utils = require('../utils'),
  User = mongoose.model('User');

exports.approveTweet = function(req, res) {
  if (req.isAuthenticated()) {

    var tweetId = req.params.id,
      foundTweet = false,
      alreadyApproved = false;

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
        var topTweets = user.top_tweets,
          lastApprovedPostTime = user.last_approved_post_time,
          newApprovedPostTime = moment().add(6, 'minutes').valueOf();

        //Check if last approved time is in the future, if yes, use it to find the next date, else use current time
        if (lastApprovedPostTime && moment(lastApprovedPostTime).diff(moment()) > 0) {
          newApprovedPostTime = moment(lastApprovedPostTime).add(6, 'minutes').valueOf();
        }

        user.last_approved_post_time = newApprovedPostTime;
        user.top_tweets = topTweets.map(function(item) {
          if (item._id.equals(tweetId)) { //Reference: https://github.com/Automattic/mongoose/issues/2352#issuecomment-58334125
            foundTweet = true;
            if (item.approved) {
              alreadyApproved = true;
              newApprovedPostTime = item.scheduled_at;
            } else {
              item.approved = true;
              item.scheduled_at = newApprovedPostTime;
            }
          }
          return item;
        });

        if (!foundTweet) {
          return res.status(404).json({
            message: 'We could not find this tweet. Try again.'
          });
        }

        if (alreadyApproved) {
          return res.status(200).json({
            success: true,
            scheduled_at: newApprovedPostTime
          });
        }

        user.total_tweets_approved += 1;
        user.total_tweets_pending_approval -= 1;

        user.save(function(err, user) {
          if (err) {
            res.status(500).json({
              message: 'There was an error approving this tweet. Try again.'
            });
          } else {
            res.status(200).json({
              success: true,
              scheduled_at: newApprovedPostTime
            });
          }
        });
      }
    });
  } else {
    respondToUnauthenticatedRequests(res)
  }
};

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
          last_cron_run_time: moment(now).subtract(45, 'minutes').valueOf(),
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
        var userObject = {
          id: user.id,
          description: user.description,
          name: user.name,
          username: user.username,
          followers: user.followers,
          following: user.following,
          profile_image_url: user.profile_image_url,
          profile_banner_url: user.profile_banner_url,
          created_at: user.created_at,
          last_cron_run_time: user.last_cron_run_time,
          total_tweets_posted: user.total_tweets_posted,
          total_tweets_pending_approval: user.total_tweets_pending_approval,
          total_tweets_approved: user.total_tweets_approved,
          total_tweets_analysed: user.total_tweets_analysed,
          tweet_action: user.tweet_action,
          fav_keywords: user.fav_keywords,
          fav_users: user.fav_users,
          user_type: user.user_type,
          activity: user.activity,
          onboard_fav_users: user.onboard_fav_users,
          onboard_fav_keywords: user.onboard_fav_keywords,
          onboard_tweet_action: user.onboard_tweet_action
        };
        return res.status(200).json(userObject);
      }
    });
  } else {
    respondToUnauthenticatedRequests(res);
  }
};

exports.getTweets = function(req, res) {
  getTweets(req, res);
};

function getTweets(req, res) {
  var userId = parseInt(req.params.id);

  if (req.isAuthenticated() && req.user.id === userId) {
    //Update or add new user to collection
    User.findOne({
      id: userId
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          message: 'There was an error finding your records'
        });
      } else {
        return res.status(200).json(user.top_tweets);
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

var fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  async = require('async'),
  Twit = require('twit'),
  Q = require('q'),
  config = require('../config'),
  argv = require('minimist')(process.argv.slice(2)),
  mongoose = require('mongoose');

//Setup config based on environment
config = (argv['environment'] === 'prod' ? config.prod : config.test);

//initiate DB connection using mongoose
mongoose.connect(config.dbUrl);

// Bootstrap models
var modelsPath = path.join(__dirname, '../models');
fs.readdirSync(modelsPath).forEach(function(file) {
  require(modelsPath + '/' + file);
});

var User = mongoose.model('User');

User.find({}, function(err, users) {
  if (err) {
    console.log(Date.now(), ': Job Stopped ', err);
  } else {
    _.each(users, function(user) {
      if (user.application_token_expired) {
        console.log(Date.now(), ': Application token invalid or expired ', user.id);
      } else {
        //Get fav_users for each user
        var favUsers = user.fav_users,
          T = new Twit({
            consumer_key: user.twitter_app_consumer_key,
            consumer_secret: user.twitter_app_consumer_secret,
            access_token: user.twitter_app_access_token,
            access_token_secret: user.twitter_app_access_token_secret
          }),
          fetchTweetsForEachFavUserFunctions = [];

        _.each(favUsers, function(favUser) {
          fetchTweetsForEachFavUserFunctions.push(fetchTweetsForEachFavUser(T, user, favUser));
        });

        async.parallel(fetchTweetsForEachFavUserFunctions, function(err, tweetsForAllFavUsersOfOneUser) {
          var tweets = [];
          tweetsForAllFavUsersOfOneUser.forEach(function(item, index) {
            tweets = tweets.concat(item.data);
          });
          findAndSaveTopTweetsForUser(tweetsForAllFavUsersOfOneUser[0].user, tweets);
        });

      }

    });
  }
});

function fetchTweetsForEachFavUser(T, user, favUser) {
  return function(callback) {

    var options = {
      screen_name: favUser.username
    };

    //Fetch tweets using since_id or last 100 tweets
    if (favUser.since_id === undefined) {
      options['count'] = 100;
    } else {
      options['since_id'] = favUser.since_id;
    }

    T.get('statuses/user_timeline', options, function(err, tweets) {
      var result = {}
      if (err) {
        console.log(Date.now(), ' : error fetching status for ', favUser.username);
        result = {
          user: user,
          favUser: favUser,
          data: []
        };
      } else {
        if (tweets.length > 0) {
          saveSinceIdForEachFavUser(user, favUser, tweets[0]['id_str']);
        }
        result = {
          user: user,
          favUser: favUser,
          data: tweets
        };
      }
      callback(null, result);
    });

  };
}


function findAndSaveTopTweetsForUser(user, tweets) {
  //console.log('top', tweets.length, tweets[0].id_str, user.id);
}


function saveSinceIdForEachFavUser(user, favUser, sinceId) {
  var tempFav = _.map(user.fav_users, function(fav) {
    if (favUser.username === fav.username) {
      fav.since_id = sinceId;
    }
    return fav;
  });
  user.fav_users = tempFav;
  user.save(function(err) {
    if (err) {
      console.log(Date.now(), ' : Error while saving since_id ', user.id);
    }
  });
}

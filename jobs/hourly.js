var fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  Twit = require('twit'),
  Q = require('q');
  config = require('../config'),
  argv = require('minimist')(process.argv.slice(2)),
  mongoose = require('mongoose');

//Setup config based on environment
config = (argv['environment'] === 'prod' ? config.prod : config.test);

//initiate DB connection using mongoose
mongoose.connect(config.dbUrl);

// Bootstrap models
var modelsPath = path.join(__dirname, '../models');
fs.readdirSync(modelsPath).forEach(function (file) {
  require(modelsPath + '/' + file);
});

var User = mongoose.model('User');

User.find({}, function(err, users) {
  console.log('hello ', err, users);
  if (err) {
    console.log(Date.now(), ': Job Stopped ', err);
  } else {
    console.log(1)
    _.each(users, function(user) {
      console.log(2)
      if (user.application_token_expired) {
        console.log(Date.now(), ': Application token invalid or expired ', user.id);
      } else {
        console.log(3)
        //Get fav_users for each user
        var favUsers = user.fav_users,
          T = new Twit({
            consumer_key: user.twitter_app_consumer_key,
            consumer_secret: user.twitter_app_consumer_secret,
            access_token: user.twitter_app_access_token,
            access_token_secret: user.twitter_app_access_token_secret
          }),
          promiseList = [];

        _.each(favUsers, function(favUser) {
          var deferred = Q.defer(),
            options = {
              screen_name: favUser.username
            };

          //Fetch tweets using since_id or last 100 tweets
          if (favUser.since_id === undefined) {
            options['count'] = 100;
          } else {
            options['since_id'] = favUser.since_id;
          }

          T.get('statuses/user_timeline', options, function(err, tweets) {

            if (err) {
              console.log(4, err);
              deferred.resolve([]);
            } else {
              console.log(7, tweets.length);
              //tweets.length > 0 ? saveSinceIdForEachFavUser(user, favUser, tweets[0]['id']);
              deferred.resolve(tweets);
            }

          });

          promiseList.push(deferred);
        });

        console.log('before', promiseList.length);
        Q.all(promiseList).then(function(results) {
          var tweets = [];
          console.log('results', results.length, results[0]);

          //save analysed tweets count in db

          //filter using keywords

          //findTopTweets(tweets)

          //save these tweets to user object

        });

      }

    });
  }
});

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

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
          //TODO: Find and save top tweets of users
          if (tweets.length > 0) {
            findAndSaveTopTweetsForUser(tweetsForAllFavUsersOfOneUser[0].user, tweets);
          }
          //TODO: Schedule the top tweets for posting
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

    //Fetch tweets using last_read_tweet_id or last 100 tweets
    if (favUser.last_read_tweet_id === undefined) {
      options['count'] = 100;
    } else {
      options['since_id'] = favUser.last_read_tweet_id;
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
          saveSinceIdForEachFavUserAndUpdateLastJobRuntime(user, favUser, tweets[0]['id_str']);
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
  var sortedTweets = _.sortByOrder(tweets, function(tweet) {
    var score = 0;
    //If status is RT'd, check original status count
    if (tweet.retweeted_status) {
      //Add score using RT and fav
      score = tweet.retweeted_status.retweet_count + tweet.retweeted_status.favorite_count;
    } else {
      score = tweet.retweet_count + tweet.favorite_count;
    }
    tweet['score'] = score;
    return score;
  }, 'desc');

  //Get top 10 from sorted list and push them in the user object
  var top10 = _.slice(sortedTweets, 0, 10);
  top10 = top10.map(function(tweet) {
    var type = 'original';
    if (tweet.retweeted_status) {
      type = 'retweet'
    }
    return {
      score: tweet.score,
      id: tweet.id_str,
      type: type
    };
  });
  user.top_tweets = user.top_tweets.concat(top10);

  //Increment Tweet analysed count in DB
  user.total_tweets_analysed += tweets.length;

  user.save(function(err) {
    if (err) {
      console.log(Date.now(), ' : Error while saving top_tweets ', user.id, err);
    } else {
      console.log('success');
    }
  });
}


function saveSinceIdForEachFavUserAndUpdateLastJobRuntime(user, favUser, sinceId) {
  var tempFav = _.map(user.fav_users, function(fav) {
    if (favUser.username === fav.username) {
      fav.last_read_tweet_id = sinceId;
    }
    return fav;
  });
  user.fav_users = tempFav;
  user.last_cron_run_time = Date.now();
  user.save(function(err) {
    if (err) {
      console.log(Date.now(), ' : Error while saving last_read_tweet_id ', user.id, err);
    }
  });
}

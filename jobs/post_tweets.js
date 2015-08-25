var fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  utils = require('../utils'),
  moment = require('moment'),
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
    console.log(Date.now(), ': Post Tweets Cron Stopped ', err);
  } else {

    console.log(Date.now() + ' - Global Post Cron Started');

    async.each(users, function(user, eachUserCallback) {
      if (user.application_token_expired) {
        console.log(Date.now(), ': Application token invalid or expired ', user.id);
      } else {
        startCronForUser(user, eachUserCallback);
      }
    }, function() {
      console.log(Date.now() + ' - Global Post Cron Init Complete');
      closeMongoConnection();
    });
  }
});

function startCronForUser(user, eachUserCallback) {
  //Get top_tweets for each user
  var now = Date.now(),
    tweetsToBePosted = _.filter(user.top_tweets, function(tweet) {
      return (tweet.posted === false) && (tweet.scheduled_at <= now);
    }),
    T = new Twit({
      consumer_key: user.twitter_app_consumer_key,
      consumer_secret: user.twitter_app_consumer_secret,
      access_token: user.twitter_app_access_token,
      access_token_secret: user.twitter_app_access_token_secret
    }),
    postTweetsForEachTopTweetFunctions = [];

  console.log('Post Tweets Cron started for user id: ' + user.id + '. New tweets: ' + tweetsToBePosted.length);

  _.each(tweetsToBePosted, function(tweet) {
    postTweetsForEachTopTweetFunctions.push(postTweet(T, user, tweet));
  });

  async.parallel(postTweetsForEachTopTweetFunctions, function(err) {
    eachUserCallback(null);
  });
}

function postTweet(T, user, tweet) {
  return function(callback) {
    if (user.tweet_action === 'NATIVE_RT') {
      utils.retweet(T, tweet.original_tweet_id, function(err, posted_tweet) {
        if (err) {
          console.log('Error posting tweet for ' + user.id + '. Twitter says: ', err.message);
          callback(null);
        } else {
          saveTweetIdAndPostedTimeToUserObject(user, Date.now(), tweet.original_tweet_id, posted_tweet.id_str, callback);
        }
      });
    } else {
      utils.tweet(T, tweet.tweet_text, function(err, posted_tweet) {
        if (err) {
          console.log('Error posting tweet for ' + user.id + '. Twitter says: ', err.message);
          callback(null);
        } else {
          saveTweetIdAndPostedTimeToUserObject(user, Date.now(), tweet.original_tweet_id, posted_tweet.id_str, callback);
        }
      });
    }
  };
}

function saveTweetIdAndPostedTimeToUserObject(user, now, original_id, id, callback) {
  var tempTopTweets = _.map(user.top_tweets, function(topTweet) {
    if (original_id === topTweet.original_tweet_id) {
      topTweet.posted_tweet_id = id;
      topTweet.posted = true;
    }
    return topTweet;
  });

  user.top_tweets = tempTopTweets;

  //Increment Tweet posted count in DB
  user.total_tweets_posted += 1;

  user.save(function(err) {
    if (err) {
      console.log(Date.now(), ' : Error while updating posted_tweet_id ', user.id, err);
    }
    callback(null);
  });
}

function closeMongoConnection() {
  mongoose.connection.close();
}

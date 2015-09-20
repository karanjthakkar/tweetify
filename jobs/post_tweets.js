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
config = config[argv['environment'] || 'local'];

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
    console.log(new Date() + ' - Post Tweets Cron Stopped. Error: ' + err);
  } else {

    console.log(new Date() + ' - Global Post Cron Started. Users found: ' + users.length);

    async.each(users, function(user, eachUserCallback) {
      if (user.application_token_expired) {
        console.log(new Date(), ' - Application token invalid or expired: ', user.id);
        eachUserCallback(null);
      } else {
        startCronForUser(user, eachUserCallback);
      }
    }, function() {
      console.log(new Date() + ' - Global Post Cron Init Complete');
      closeMongoConnection();
    });
  }
});

function startCronForUser(user, eachUserCallback) {
  //Get top_tweets for each user
  var now = Date.now(),
    tweetsToBePosted = _.filter(user.top_tweets, function(tweet) {
      return (tweet.posted === false) && (tweet.approved === true) && (tweet.scheduled_at <= now);
    }),
    T = new Twit({
      consumer_key: config.TWITTER_CONSUMER_KEY,
      consumer_secret: config.TWITTER_CONSUMER_SECRET,
      access_token: user.twitter_token,
      access_token_secret: user.twitter_token_secret
    }),
    postTweetsForEachTopTweetFunctions = [];

  console.log(new Date() + ' - Post Tweets Cron started for user id: ' + user.id + '. New tweets: ' + tweetsToBePosted.length);

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
        var postedTweetId, error;
        if (err) {
          console.log(new Date() + ' - Error posting tweet for ' + user.id + '. Twitter says: ', err.message);
          error = err.message;
        }
        if (posted_tweet) {
          postedTweetId = posted_tweet.id_str;
        }
        saveTweetIdAndPostedTimeToUserObject(user, Date.now(), tweet.original_tweet_id, postedTweetId, error, callback);
      });
    } else if (user.tweet_action === 'TEXT_RT') {
      utils.tweet(T, getTweetTextWithCredits(tweet), function(err, posted_tweet) {
        var postedTweetId, error;
        if (err) {
          console.log(new Date() + ' - Error posting tweet for ' + user.id + '. Twitter says: ', err.message);
          error = err.message;
        }
        if (posted_tweet) {
          postedTweetId = posted_tweet.id_str;
        }
        saveTweetIdAndPostedTimeToUserObject(user, Date.now(), tweet.original_tweet_id, postedTweetId, error, callback);
      });
    } else {
      utils.tweet(T, tweet.tweet_text, function(err, posted_tweet) {
        var postedTweetId, error;
        if (err) {
          console.log(new Date() + ' - Error posting tweet for ' + user.id + '. Twitter says: ' + err.message);
          error = err.message;
        }
        if (posted_tweet) {
          postedTweetId = posted_tweet.id_str;
        }
        saveTweetIdAndPostedTimeToUserObject(user, Date.now(), tweet.original_tweet_id, postedTweetId, error, callback);
      });
    }
  };
}

function getTweetTextWithCredits(tweet) {
  var credits = 'RT @' + tweet.tweet_author + ': ',
    text = credits + tweet.tweet_text;

  return utils.processTweet(text);
}

function saveTweetIdAndPostedTimeToUserObject(user, now, original_id, id, error, callback) {
  var tempTopTweets = _.map(user.top_tweets, function(topTweet) {
    if (original_id === topTweet.original_tweet_id) {
      topTweet.posted_tweet_id = id;
      topTweet.posted = true;
      topTweet.error = error;
      topTweet.tweet_action = user.tweet_action;
    }
    return topTweet;
  });

  user.top_tweets = tempTopTweets;

  //Increment Tweet posted count in DB
  user.total_tweets_posted += 1;

  user.save(function(err) {
    if (err) {
      console.log(new Date() + ' - Error while updating posted_tweet_id: ' + user.id + '. Error: ' + err);
    }
    callback(null);
  });
}

function closeMongoConnection() {
  mongoose.connection.close();
}

var fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  twttr = require('twitter-text'),
  Constants = require('../constants'),
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
    console.log(Date.now() + ' - Fetch Tweets Cron Stopped - ' + err);
  } else {

    console.log(Date.now() + ' - Global Fetch Cron Started. Users found: ' + users.length);

    async.each(users, function(user, eachUserCallback) {
      if (user.application_token_expired) {
        console.log(Date.now() + ' - Application token invalid or expired ' + user.id);
        eachUserCallback(null);
      } else if (user.activity === 'OFF') {
        console.log(Date.now() + ' - Activity turned off - ' + user.id);
        eachUserCallback(null);
      } else {
        startCronForUser(user, eachUserCallback)
      }
    }, function() {
      console.log(Date.now() + ' - Global Fetch Cron Init Complete');
      closeMongoConnection();
    });
  }
});

function startCronForUser(user, eachUserCallback) {
  var oldCron = user.last_cron_run_time,
    newCron = Date.now(),
    isHourComplete = moment.duration(moment(newCron).diff(moment(oldCron))).asMinutes() > 60;

  if (!isHourComplete) {
    return eachUserCallback(null);
  }

  console.log('Fetch Tweets Cron started for user id - ' + user.id);

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

    if (tweets.length > 0) {
      findAndSaveTopTweetsForUser(tweetsForAllFavUsersOfOneUser[0].user, tweets, eachUserCallback);
    } else {
      console.log('Fetch Tweets Cron complete for user id - ' + user.id + '. No new tweets.');
      eachUserCallback(null);
    }

  });
}

function closeMongoConnection() {
  mongoose.connection.close();
}

function fetchTweetsForEachFavUser(T, user, favUser) {
  return function(callback) {

    var options = {
      screen_name: favUser.username
    };

    //Fetch tweets using last_read_tweet_id or last 100 tweets
    if (favUser.last_read_tweet_id === undefined) {
      options['count'] = Constants.DEFAULT_TWEET_LIMIT;
    } else {
      options['since_id'] = favUser.last_read_tweet_id;
    }

    T.get('statuses/user_timeline', options, function(err, tweets) {
      var result = {}
      if (err) {
        console.log(Date.now() + ' - error fetching status for ' + favUser.username + ' - ' + err.message);
        result = {
          user: user,
          favUser: favUser,
          data: []
        };
        callback(null, result);
      } else {
        if (tweets.length > 0) {
          saveSinceIdForEachFavUserAndUpdateLastJobRuntime(user, favUser, tweets[0]['id_str'], function() {
            var result = {
              user: user,
              favUser: favUser,
              data: filterTweetsByKeyword(user, tweets)
            };
            callback(null, result);
          });
        } else {
          result = {
            user: user,
            favUser: favUser,
            data: []
          };
          callback(null, result);
        }
      }
    });

  };
}

function filterTweetsByKeyword(user, tweets) {
  var keywords = _.map(user.fav_keywords, function(item) {
    return item.keyword;
  });
  return _.filter(tweets, function(tweet) {
    var tweetText = tweet.retweeted_status ? tweet.retweeted_status.text : tweet.tweetText;
    return new RegExp(keywords.join('|'), 'gi').test(tweetText);
  });
}

function findAndSaveTopTweetsForUser(user, tweets, eachUserCallback) {

  var filteredTweets = _.filter(tweets, filterByLengthAndSpam.bind({user: user})),
    sortedTweets = _.sortByOrder(filteredTweets, [
      sortyByEngagement
    ], ['desc', 'desc']),
    TOP_TWEET_LIMIT = Constants['TOP_TWEETS_LIMIT_' + user.user_type];

  //Get top from sorted list and push them in the user object
  var topTweets = _.slice(sortedTweets, 0, TOP_TWEET_LIMIT);
  var currentTime = moment();
  topTweets = topTweets.map(function(tweet) {
    var type = 'original';
    if (tweet.retweeted_status) {
      type = 'retweet'
    }

    currentTime = moment(currentTime).add(6, 'minutes'); //Add 6 minutes to each tweet

    return {
      original_tweet_author: tweet.user.screen_name,
      original_tweet_profile_image_url: tweet.user.profile_image_url,
      tweet_score: tweet.score,
      tweet_text: getTweetText(tweet, user),
      original_tweet_id: tweet.retweeted_status ? tweet.retweeted_status.id_str : tweet.id_str,
      tweet_type: type,
      scheduled_at: parseInt(currentTime.format('x')),
      posted: false
    };
  });
  user.top_tweets = user.top_tweets.concat(topTweets);

  //Increment Tweet analysed count in DB
  user.total_tweets_analysed += tweets.length;
  user.total_tweets_scheduled = user.top_tweets.length;

  user.save(function(err) {
    if (err) {
      console.log(Date.now() + ' - Error while saving top_tweets - ' + user.id + ' - ' + err);
    }
    console.log('Fetch Tweets Cron complete for user id - ' + user.id + '. New tweets: ' + tweets.length);
    eachUserCallback(null);
  });
}

function sortyByEngagement(tweet) {
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
}

function filterByLengthAndSpam(tweet) {
  return filterByLength(tweet, this.user) && filterSpam(tweet, this.user);
}

function filterByLength(tweet, user) {
  var isLessThanMax = twttr.getTweetLength(getTweetText(tweet, user)) < 140;
  return isLessThanMax;
}

function filterSpam(tweet, user) {
  var text = getTweetText(tweet, user, false);

  /* Patterns given less score:
  *  1. Starting with @ -> /^\s{0,}[@|\.@]/gi
  *  2. Starting with .@ -> /^\s{0,}[@|\.@]/gi
  *  3. Containing … OR ... -> /\…|\.{3}/gi (This normally means the text was truncated by twitter since it was posted by a third party app with text length > 140)
  */
  if (/^\s{0,}[RT|@|\.@]/gi.test(text) || /\…|\.{3}/gi.test(text)) {
    return false;
  }

  return true;
}

function getTweetText(tweet, user, withCredits) {
  var shouldPrependCredits = (user.tweet_action === 'TEXT_RT'),
    actualTweet = tweet.retweeted_status || tweet,
    text = actualTweet.text;

  withCredits = withCredits === undefined ? true : withCredits;

  if (shouldPrependCredits && withCredits) {
    var credits = 'RT @' + actualTweet.user.screen_name + ': ';
    text = credits + text;
  }

  return utils.processTweet(text);
}

function saveSinceIdForEachFavUserAndUpdateLastJobRuntime(user, favUser, sinceId, callback) {
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
      console.log(Date.now() + ' - Error while saving last_read_tweet_id - ' + user.id + ' - ' + err);
    }
    callback(null);
  });
}

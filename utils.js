var Twit = require('twit'),
  Constants = require('./constants'),
  config = require('./config'),
  _ = require('lodash'),
  argv = require('minimist')(process.argv.slice(2));

//Setup config based on environment
config = config[argv['environment'] || 'local'];;

module.exports = {

  tweet: function(T, text, callback) {
    T.post('statuses/update', {
      status: text
    }, function(err, data, response) {
      callback(err, data);
    });
  },

  retweet: function(T, id, callback) {
    T.post('statuses/retweet', {
      id: id
    }, function(err, data, response) {
      callback(err, data);
    });
  },

  tweetToClient: function(text, callback) {
    console.log(config.TWITTER_CONSUMER_KEY, config.TWITTER_CONSUMER_SECRET);
    T = new Twit({
      consumer_key: config.TWITTER_CONSUMER_KEY,
      consumer_secret: config.TWITTER_CONSUMER_SECRET,
      access_token: config.TWITTER_ACCESS_TOKEN,
      access_token_secret: config.TWITTER_ACCESS_TOKEN_SECRET
    });
    this.tweet(T, text, callback);
  },

  sendWelcomeTweet: function(user) {
    var text = Constants.WELCOME_TWEET_TEXT.replace('{username}', user.username);
    this.tweetToClient(text, _.noop);
  },

  processTweet: function(text) {
    return text.replace(/\\n+/, ' ').replace('&amp;', '&');
  }

}

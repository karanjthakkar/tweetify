var config = {
  test: {
    callbackURL: '//localhost:3000/auth/twitter/callback',
    dbUrl: 'mongodb://localhost:27017/tweetlyapp',
    TWITTER_CONSUMER_KEY: process.env.tweetly_consumer_key,
    TWITTER_CONSUMER_SECRET: process.env.tweetly_consumer_secret
  },
  production: {

  }
};

module.exports = config;

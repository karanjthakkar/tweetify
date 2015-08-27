var config = {
  test: {
    callbackURL: '//api.tweetify.io/auth/twitter/callback',
    dbUrl: 'mongodb://127.0.0.1:27017/tweetlyapp',
    TWITTER_CONSUMER_KEY: process.env.tweetly_consumer_key,
    TWITTER_CONSUMER_SECRET: process.env.tweetly_consumer_secret,
    TWITTER_ACCESS_TOKEN: process.env.tweetly_access_token,
    TWITTER_ACCESS_TOKEN_SECRET: process.env.tweetly_access_token_secret
  },
  production: {

  }
};

module.exports = config;

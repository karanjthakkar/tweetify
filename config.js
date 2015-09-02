var config = {
  local: {
    callbackURL: '//local.tweetify.io:3000/auth/twitter/callback',
    dbUrl: 'mongodb://127.0.0.1:27017/tweetify-local',
    TWITTER_CONSUMER_KEY: process.env.tweetify_consumer_key,
    TWITTER_CONSUMER_SECRET: process.env.tweetify_consumer_secret,
    TWITTER_ACCESS_TOKEN: process.env.tweetify_access_token,
    TWITTER_ACCESS_TOKEN_SECRET: process.env.tweetify_access_token_secret,
    frontendUrl: 'http://local.tweetify.io'
  },
  staging: {
    callbackURL: '//api.tweetify.io/auth/twitter/callback',
    dbUrl: 'mongodb://127.0.0.1:27017/tweetify-staging',
    TWITTER_CONSUMER_KEY: process.env.tweetify_consumer_key,
    TWITTER_CONSUMER_SECRET: process.env.tweetify_consumer_secret,
    TWITTER_ACCESS_TOKEN: process.env.tweetify_access_token,
    TWITTER_ACCESS_TOKEN_SECRET: process.env.tweetify_access_token_secret,
    frontendUrl: 'http://staging.tweetify.io'
  },
  prod: {
    callbackURL: '//api.tweetify.io/auth/twitter/callback',
    dbUrl: 'mongodb://127.0.0.1:27017/tweetify',
    TWITTER_CONSUMER_KEY: process.env.tweetify_consumer_key,
    TWITTER_CONSUMER_SECRET: process.env.tweetify_consumer_secret,
    TWITTER_ACCESS_TOKEN: process.env.tweetify_access_token,
    TWITTER_ACCESS_TOKEN_SECRET: process.env.tweetify_access_token_secret,
    frontendUrl: 'http://tweetify.io'
  }
};

module.exports = config;

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * User Schema
 */
var UserSchema = new Schema({
  id: Number,
  name: String,
  username: String,
  description: String,
  location: String,
  verified: Boolean,
  profile_image_url: String,
  profile_banner_url: String,
  followers: String,
  following: String,
  favorites: String,
  statuses: String,
  lists: String,
  user_type: {
    type: String,
    default: 'FREE'
  },
  application_token_expired: {
    type: Boolean,
    default: false
  },
  twitter_token: String,
  twitter_token_secret: String,
  twitter_app_consumer_key: {
    type: String,
    default: ''
  },
  twitter_app_consumer_secret: {
    type: String,
    default: ''
  },
  twitter_app_access_token: {
    type: String,
    default: ''
  },
  twitter_app_access_token_secret: {
    type: String,
    default: ''
  },
  access_level: String,
  last_access_date: Number,
  created_at: Number,
  fav_users: [{
    username: String,
    name: String,
    profile_image_url: String,
    last_read_tweet_id: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  fav_keywords: [{
    keyword: String,
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  tweet_action: { //Types: COPY, NATIVE_RT, TEXT_RT, QUOTE
    type: String,
    default: 'COPY'
  },
  last_cron_run_time: Number,
  top_tweets: [{
    original_tweet_author: String,
    original_tweet_profile_image_url: String,
    original_tweet_id: String,
    tweet_score: Number,
    tweet_type: String,
    tweet_text: String,
    posted_tweet_id: String,
    scheduled_at: Number,
    posted_at: Number,
    posted: Boolean,
    error: String,
    tweet_action: String
  }],
  total_tweets_analysed: {
    type: Number,
    default: 0
  },
  total_tweets_scheduled: {
    type: Number,
    default: 0
  },
  total_tweets_posted: {
    type: Number,
    default: 0
  },
  activity: {
    type: String,
    default: 'ON'
  },
  onboard_fav_users: {
    type: Boolean,
    default: false
  },
  onboard_fav_keywords: {
    type: Boolean,
    default: false
  },
  onboard_tweet_action: {
    type: Boolean,
    default: false
  }
});

mongoose.model('User', UserSchema);

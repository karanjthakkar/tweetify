var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * User Schema
 */
var UserSchema = new Schema({
  id: Number,
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
  application_token_expired: {
    type: Boolean,
    default: true
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
  last_cron_run_time: Number,
  top_tweets: [{
    original_tweet_id: String,
    tweet_score: Number,
    tweet_type: String,
    tweet_text: String,
    posted_tweet_id: String,
    scheduled_at: Number,
    posted_at: Number,
    posted: Boolean
  }],
  total_tweets_analysed: {
    type: Number,
    default: 0
  }
});

mongoose.model('User', UserSchema);

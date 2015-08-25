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

  processTweet: function(text) {
    return text.replace(/\\n+/, ' ').replace('&amp;', '&');
  }

}

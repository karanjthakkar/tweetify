var mongoose = require('mongoose'),
  _ = require('lodash'),
  User = mongoose.model('User');


exports.saveOrUpdateUserData = function(userData, done) {

  var user;

  //Update or add new user to collection
  User.findOne({
    id: userData.id
  }, function(err, user) {
    if (err) {
      return done(err); //If some error, return it
    } else {
      if (!user) { //Check if user is present in db. If not, create a new user
        var now = Date.now();
        userData = _.extend(userData, {
          last_cron_run_time: now,
          created_at: now,
          last_access_date: now
        });
        user = new User(userData);
      } else { //Else update existing user
        _.forOwn(userData, function(value, key) {
          user[key] = userData[key];
        });
        user.last_access_date = Date.now();
      }
      user.save(function(err, user) {
        done(err, {
          id: user.id,
          username: user.username
        });
      });
    }
  });

};

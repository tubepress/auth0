function (user, context, callback) {

  var debug = false,
    log     = function (message) {

      console.log('===> ' + context.sessionID + ' Recurly account code: ' + message);
    },

    rando = function () {

      var rand = Math.random();

      return Math.floor(rand * (999999 - 100000 + 1 ) + 100000);
    };

  user.app_metadata         = user.app_metadata || {};
  user.app_metadata.recurly = user.app_metadata.recurly || {};

  if (user.app_metadata.recurly.hasOwnProperty('accountCode')) {

    if (debug) {

      log('User already has Recurly account code. Booyah.');
    }

    return callback(null, user, context);
  }

  if (debug) {

    log('Need to generate account code for user.');
  }

  var date = new Date(),
    year   = date.getFullYear(),
    rand1  = rando(),
    rand2  = rando();

  user.app_metadata.recurly.accountCode = year + '-' + rand1 + '-' + rand2;

  if (debug) {

    log('New code is ' + user.app_metadata.recurly.accountCode);
  }

  auth0.users.updateAppMetadata(user.user_id, user.app_metadata)
    .then(function () {

      if (debug) {

        log('Auth0 accepted the app_metadata update.');
      }

      callback(null, user, context);
    })
    .catch(function (err) {

      if (debug) {

        log('Auth0 rejected the app_metadata update: ' + err);
      }

      callback(err);
    });
}
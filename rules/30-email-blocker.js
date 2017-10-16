function (user, context, callback) {

  var options = {

      // message to be displayed to the spammer
      errorMessage : 'Please contact support@tubepress.com for assistance.',

      emailRegexes : JSON.parse(configuration.BLOCKED_EMAIL_REGEXES),

      debug: false
    },

    //*************************************************************************************************
    //** STOP EDITING *********************************************************************************
    //*************************************************************************************************

    log = function (message) {

      console.log('===> ' + context.sessionID + ' Email blocker rule: ' + message);
    };

  // short-circuit if the user signed up already
  if (context.stats.loginsCount > 1) {

    if (options.debug) {

      log('Repeat login. Skipping check.');
    }

    return callback(null, user, context);
  }

  if (options.debug) {

    log('Checking user against regexes: ' + JSON.stringify(options.emailRegexes));
  }

  var badGuy = false,
    index    = 0;

  for (index; index < options.emailRegexes.length; index++) {

    var re = new RegExp(options.emailRegexes[index], 'i'),
      badEmail = re.test(user.email) || (
        _.has(user, 'app_metadata.twitter.email') &&
        re.test(user.app_metadata.twitter.email)
      );

    if (badEmail) {

      badGuy = true;
      break;
    }
  }

  if (badGuy) {

    if (options.debug) {

      log('User email is blocked. Denying access.');
    }

    return callback(new UnauthorizedError(options.errorMessage));
  }

  if (options.debug) {

    log('User is clean. Granting access.');
  }

  return callback(null, user, context);
}
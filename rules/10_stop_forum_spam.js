function (user, context, callback) {

  var options = {

      // check the user's IP address against the database?
      checkIp : true,

      // check the user's email against the database?
      checkEmail : true,

      // how sure we should be (0% - 100%) to consider the IP a spammer?
      ipConfidenceThreshold : 90.0,

      // how sure we should be (0% - 100%) to consider the email a spammer?
      emailConfidenceThreshold : 90.0,

      // if checking both the IP and email, do they both have to be flagged
      // as spammers? or does just one of them have to be considered spam?
      unanimousVote : false,

      // if an error is encountered (e.g. stopforumspam.org is down),
      // do we allow login/registration to proceed?
      failOpen : true,

      // perform these checks only the first time they log in? or every time?
      firstLoginOnly : true,

      // which connections to check?
      connections: [ 'auth0' ],

      // return true to check the user against SFS, false to "pass through"
      // and skip the check entirely
      shouldCheckUser : function () { return true; },

      // fired when an error is encountered. allows you to add attributes to the user
      // or context
      onFailure : function (message) {},

      // called when SFS determines that this user is a spammer
      onSpammerFound : function (stopForumSpamApiResponseAsObject) {

        user.user_metadata               = user.user_metadata || {};
        user.user_metadata.stopForumSpam = stopForumSpamApiResponseAsObject;

        auth0.users.updateUserMetadata(user.user_id, user.user_metadata)
          .then(function() { callback(null, user, context); })
          .catch(function(err) { callback(err); });
      },

      // message to be displayed to the spammer
      errorMessage : 'Your email or IP address is not allowed. Please contact us for assistance.',

      debug: false
    },

    //*************************************************************************************************
    //** STOP EDITING *********************************************************************************
    //*************************************************************************************************

    log = function (message) {

      console.log('===> ' + context.sessionID + ' SFS rule: ' + message);
    },

    handleFailure = function (message) {

      options.onFailure(message);

      if (options.debug) {

        log('SFS API request failed: ' + message);
      }

      if (options.failOpen) {

        if (options.debug) {

          log('Failing open');
        }

        return callback(null, user, context);
      }

      if (options.debug) {

        log('Denying access');
      }

      return callback(message, user, context);
    },

    isSpammer = function (body, property, threshold) {

      if (!body.hasOwnProperty(property)) {

        return false;
      }

      if (!body[property].appears) {

        return false;
      }

      return body[property].confidence >= threshold;
    },

    onSfsRequestComplete = function (err, response, body) {

      if (options.debug) {

        log('SFS API request complete');
      }

      // check for HTTP errors
      if (err) {

        return handleFailure(err);
      }

      // check for non-200
      if (response.statusCode !== 200) {

        return handleFailure('Received HTTP ' + response.statusCode);
      }

      // check for SFS error
      if (body.hasOwnProperty('error')) {

        return handleFailure('Stop Forum Spam error: ' + body.error);
      }

      if (options.debug) {

        log('Response from SFS: ' + JSON.stringify(body));
      }

      var emailIsFromSpammer = isSpammer(body, 'email', options.emailConfidenceThreshold),
        ipIsFromSpammer      = isSpammer(body, 'ip', options.ipConfidenceThreshold),
        finalIsSpammer       = options.unanimousVote ? emailIsFromSpammer && ipIsFromSpammer :
          emailIsFromSpammer || ipIsFromSpammer;

      // we have a spammer
      if (finalIsSpammer) {

        if (options.debug) {

          log('New spammer found. Denying access');
        }

        options.onSpammerFound(body);

        return callback(new UnauthorizedError(options.errorMessage));
      }

      if (options.debug) {

        log('User is not a spammer.');
      }

      // all checks pass
      return callback(null, user, context);
    },

    checkSfs = function (toCheck) {

      var requestParams = {
        url: 'http://api.stopforumspam.org/api',
        qs: {
          f: 'json'
        },
        json: true
      };

      if (toCheck.email) {

        requestParams.qs.email = toCheck.email;
      }

      if (toCheck.ip) {

        requestParams.qs.ip = toCheck.ip;
      }

      if (options.debug) {

        log('Making API request to SFS. ' + JSON.stringify(requestParams));
      }

      request.get(requestParams, onSfsRequestComplete);
    },

    execute = function (user, context) {

      var ip           = context.request.ip,
        email          = user.email,
        user_id        = user.user_id,
        canCheckIp     = ip && options.checkIp,
        canCheckEmail  = email && options.checkEmail,
        whitelisted    = !options.shouldCheckUser(),
        nothingToCheck = !canCheckIp && !canCheckEmail,
        toCheck        = {},
        skipByLoginCnt = options.firstLoginOnly && context.stats.loginsCount > 1,
        skipConnection = _.indexOf(options.connections, context.connection) === -1;

      if (options.debug) {

        log('Check details: ' + JSON.stringify({
          ip             : ip,
          email          : email,
          user_id        : user_id,
          whitelisted    : whitelisted,
          skipByLoginCnt : skipByLoginCnt,
          skipConnection : skipConnection
        }));
      }

      if (user.hasOwnProperty('user_metadata') && user.user_metadata.hasOwnProperty('stopForumSpam')) {

        if (options.debug) {

          log('User is a spammer. Blocking login.');
        }

        return callback(new UnauthorizedError(options.errorMessage));
      }

      if (whitelisted || skipByLoginCnt || nothingToCheck || skipConnection) {

        if (options.debug) {

          log('Skipping check for user and passing.');
        }

        return callback(null, user, context);
      }

      if (options.debug) {

        log('We will check this user');
      }

      if (canCheckIp) {

        if (options.debug) {

          log('We can check the IP');
        }

        toCheck.ip = ip;
      }

      if (canCheckEmail) {

        if (options.debug) {

          log('We can check the email');
        }

        toCheck.email = email;
      }

      checkSfs(toCheck);
    };

  execute(user, context, callback);
}

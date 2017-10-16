function (user, context, callback) {

  var log = function (message) {

      console.log('===> ' + context.sessionID + ' Twitter rule: ' + message);
    };

  if (context.connectionStrategy !== 'twitter') {

    log('Non-Twitter login. Passing.');

    return callback(null, user, context);
  }

  if (_.has(user, 'app_metadata.twitter.email') && user.app_metadata.twitter.email.length > 0) {

    log('Already have the Twitter email address for this user. Passing.');

    return callback(null, user, context);
  }

  var debug          = false,
    oauth            = require('oauth-sign'),
    request          = require('request'),
    uuid             = require('uuid'),
    url              = 'https://api.twitter.com/1.1/account/verify_credentials.json',
    twitterIdentity  = _.find(user.identities, { connection: 'twitter' }),
    oauthToken       = twitterIdentity ? twitterIdentity.access_token : null,
    oauthTokenSecret = twitterIdentity ? twitterIdentity.access_token_secret : null,
    timestamp        = Date.now() / 1000,
    nonce            = uuid.v4().replace(/-/g, ''),
    consumerKey      = configuration.TWITTER_CONSUMER_KEY,
    consumerSecret   = configuration.TWITTER_CONSUMER_SECRET,

    params = {
      include_email          : true,
      oauth_consumer_key     : consumerKey,
      oauth_nonce            : nonce,
      oauth_signature_method : 'HMAC-SHA1',
      oauth_timestamp        : timestamp,
      oauth_token            : oauthToken,
      oauth_version          : '1.0'
    },
    auth,
    onTwitterResponse = function (err, resp, body) {

      if (debug) {

        log('Twitter responded.');
      }

      if (err) {

        if (debug) {

          log('Error: ' + JSON.stringify(err));
        }

        return callback(null, user, context);
      }

      if (debug) {

        log('Twitter response: ' + JSON.stringify(resp));
      }

      if (resp.statusCode !== 200) {

        // this failed
        return callback(null, user, context);
      }

      var result;

      try {

        result = JSON.parse(body);

      } catch (e) {

        // this failed
        return callback(null, user, context);
      }

      if (!result.email) {

        // this failed
        return callback(null, user, context);
      }

      user.app_metadata               = user.app_metadata || {};
      user.app_metadata.twitter       = user.app_metadata.twitter || {};
      user.app_metadata.twitter.email = result.email;

      if (debug) {

        log('Adding Twitter email: ' + result.email);
      }

      auth0.users.updateAppMetadata(user.user_id, user.app_metadata);

      return callback(null, user, context);
    };

  if (!twitterIdentity) {

    if (debug) {

      log('No Twitter identity. Weird.');
    }

    return callback(null, user, context);
  }

  params.oauth_signature = oauth.hmacsign('GET', url, params, consumerSecret, oauthTokenSecret);

  auth = Object.keys(params).sort().map(function (k) {

    return k + '="' + oauth.rfc3986(params[k]) + '"';

  }).join(', ');

  if (debug) {

    log('Making request to ' + url + ' with ' + JSON.stringify(params));
  }

  request({
    url     : url + '?include_email=true',
    headers : {
      'Authorization' : 'OAuth ' + auth
    }
  }, onTwitterResponse);
}
function (user, context, callback) {

  var debug = false,
    log     = function (message) {

    console.log('===> ' + context.sessionID + ' ' + message);
  };

  if (debug) {

    log('Starting rules execution.');
    log(JSON.stringify({
      user_id             : user.user_id,
      email               : user.email,
      email_verified      : user.email_verified,
      user_metadata       : user.user_metadata,
      app_metadata        : user.app_metadata,
      created_at          : user.created_at,
      client_id           : context.clientID,
      client_name         : context.clientName,
      client_meta         : context.clientMetadata,
      connection          : context.connection,
      connection_strategy : context.connectionStrategy,
      protocol            : context.protocol,
      stats               : context.stats,
      sso                 : context.sso,
      request             : context.request
    }));
  }

  return callback(null, user, context);
}

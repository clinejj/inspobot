const SlackStrategy = require('passport-slack').Strategy;

module.exports = (passport, models) => {
  passport.use(new SlackStrategy({
    clientID: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    callbackURL: process.env.SLACK_SIGNIN_REDIRECT_URL,
    scope: ['identity.basic']
  }, async (accessToken, refreshToken, profile, done) => {
    let userCreate = await models.User.findOrCreate({
      where: {
        userId: profile.id,
        teamId: profile.team.id
      },
      defaults: {
        isChannel: false
      }
    });
    let user = userCreate[0];
    user.name = profile.user.name;
    // we don't save the display name since the response here doesn't map to
    // display_name from users:info
    user = await user.save();
    return done(null, profile);
  }));

  passport.serializeUser((user, done) => {
    done(null, `${user.id}--${user.team.id}`);
  });
  passport.deserializeUser(async (user, done) => {
    const userMeta = user.split('--');
    const userId = userMeta[0];
    const teamId = userMeta[1];
    const fullUser = await models.User.findOne({ where: { userId: userId, teamId: teamId } });
    done(null, fullUser);
  });
}

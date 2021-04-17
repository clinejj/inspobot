const helpers = require('../util/helpers');

module.exports = (app, passport) => {
  
  app.get('/login', (req, res) => {    
    if (req.isAuthenticated()) {
      return res.redirect('/inspire');
    }
    
    let signInScopes = ['identity.basic']

    let signInParams = {
      client_id: process.env.SLACK_CLIENT_ID,
      scope: signInScopes.join(' '),
      redirect_uri: process.env.SLACK_SIGNIN_REDIRECT_URL
    };
    
    let signInURL = helpers.getUrlWithParams('https://slack.com/oauth/authorize', signInParams);
    
    let error = {};
    if (req.session.previousError) {
      error = req.session.previousError;
      delete req.session.previousError;
    }
    
    res.render('login', { user: req.user, signInURL: signInURL, error: error });
  });
  
  app.get('/login/redirect', passport.authenticate('slack', { failureRedirect: '/login'}), (req, res) => {
    res.redirect('/inspire');
  });
  
  app.get('/login/failure', (req, res) => {
    req.session.previousError = { message: 'error during login, please try again.' };
    res.redirect('/login');
  });
  
  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });
};
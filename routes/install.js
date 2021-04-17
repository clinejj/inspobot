const queue = require('bull');
const config = require('../config/config').redis;

const helpers = require('../util/helpers');
const fetch = require('node-fetch');
const randomString = require('randomstring');
const { URLSearchParams } = require('url');

const { WebClient } = require('@slack/web-api');

const messageQueue = new queue('post_messages', {redis: config });

module.exports = (app, redisClient) => {
  
  app.get('/install', async (req, res) => {
    if (req.isAuthenticated()) {
      const team = await app.get('models').Team.findOne({ where: { teamId: req.user.teamId }});
      if (team) {
        return res.redirect('/inspire');
      }
    }
    
    let installScopes = ['bot'];
    let state = 'sis:' + randomString.generate();
    
    let redisWrite = await redisClient.set(state, state, 'EX', 10*60); // Expire after 10 minutes
    
    let installParams = {
      client_id: process.env.SLACK_CLIENT_ID,
      scope: installScopes.join(' '), 
      redirect_uri: process.env.SLACK_INSTALL_REDIRECT_URL,
      state: state
    };
    
    let addToSlackURL = helpers.getUrlWithParams('https://slack.com/oauth/authorize', installParams);
    
    let error = {};
    if (req.session.previousError) {
      error = req.session.previousError;
      delete req.session.previousError;
    }
    
    res.render('install', { user: req.user, addToSlackURL:addToSlackURL, error: error });
  });
  
  app.get('/install/redirect', async (req, res) => {
    let state = req.query.state;
    let redisState = await redisClient.get(state);
    
    if (redisState) {
      let redisDelete = await redisClient.del(state);
    } else {
      console.log('Invalid state');
      req.session.prevError = { message: 'we could not validate your installation. please try again.' };
      return res.redirect('/install');
    }
    
    if (!req.query.code) {
      console.log('Invalid code on query params');
      req.session.prevError = { message: 'we could not validate your installation. please try again.' };
      return res.redirect('/install');
    }

    const params = new URLSearchParams();
    params.append('client_id', process.env.SLACK_CLIENT_ID);
    params.append('client_secret', process.env.SLACK_CLIENT_SECRET);
    params.append('redirect_uri', process.env.SLACK_INSTALL_REDIRECT_URL);
    params.append('code', req.query.code);

    try {
      let response = await fetch('https://slack.com/api/oauth.access', { method: 'post', body: params });
      if (response.ok) {
        let slackData = await response.json();
        
        if(!slackData) throw new Error('Invalid Slack API data received');
        if(!slackData.ok) throw new Error(slackData.error);
        
        const teamCreate = await app.get('models').Team.findOrCreate({
          where: {
            teamId: slackData.team_id
          },
          defaults: {
            accessToken: slackData.access_token,
            scope: slackData.scope,
            teamName: slackData.team_name,
            botUserId: slackData.bot.bot_user_id,
            botAccessToken: slackData.bot.bot_access_token
          }
        });
        let team = teamCreate[0];
        // If team was not created, set fields to updated slack response
        if (!teamCreate[1]) {
          team.accessToken = slackData.access_token;
          team.scope = slackData.scope;
          team.teamName = slackData.team_name;
          team.botUserId = slackData.bot.bot_user_id;
          team.botAccessToken = slackData.bot.bot_access_token;
          team = await team.save();
        }
        
        // Save user
        const userCreate = await app.get('models').User.findOrCreate({
          where: {
            userId: slackData.user_id,
            teamId: team.teamId
          },
          defaults: {
            isChannel: false
          }
        });
        
        let user = userCreate[0];
        // fetch additional data from slack and save to user
        const web = new WebClient(team.botAccessToken);
        const slackResponse = await web.users.info({
          user: user.userId,
          include_locale: true
        });
        if (slackResponse.ok) {
          user.name = slackResponse.user.profile.real_name;
          user.displayName = slackResponse.user.profile.display_name;
          user = await user.save();
        }
        
        req.login({ id: user.userId, team: { id: team.teamId }}, (error) => {
          if (error) { 
            console.log(error); 
            req.session.prevError = error;
          }
          req.session.flashMessage = 'success! inspobot is now a part of your team!';
          return res.redirect('/inspire');
        });
      }
    } catch (error) {
      console.log(error);
      req.session.prevError = error;
      return res.redirect('/install');
    }
  });

}

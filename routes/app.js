const bodyParser = require('body-parser');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const helpers = require('../util/helpers');
const scheduler = require('../util/messageScheduler');

module.exports = (app, passport) => {
  
  app.get('/inspire', ensureLoggedIn('/login'), async (req, res) => {    
    if (!req.user && !(req.user.id && req.user.teamId)) {
      res.render('app', { error: { message: 'user information not found.' } } )
    }

    const user = req.user;
    const teamQuery = app.get('models').Team.findOne({ where: { teamId: user.teamId }});
    const jobQuery = app.get('models').InspirationJob.findOne({ where: { userId: user.userId, teamId: user.teamId }});
    
    const publicChannelsQuery = app.get('models').User.findAll({ where: { teamId: user.teamId, isChannel: true, channelType: 'C' }});
    const privateChannelsQuery = app.get('models').User.findAll({ where: { teamId: user.teamId, isChannel: true, channelType: 'G', inviter: user.userId }});
    
    const [team, existingJob, publicChannels, privateChannels] = await Promise.all([teamQuery, jobQuery, publicChannelsQuery, privateChannelsQuery]);
    
    let defaultJob = { hour: 9, minute: 0, weekdaysOnly: false };    
    user.job = helpers.cronJobParser(existingJob, Object.assign({}, defaultJob));
    
    let channelIds = [];
    for (let channel in publicChannels) {
      channelIds.push(publicChannels[channel].userId);
    }
    for (let channel in privateChannels) {
      channelIds.push(privateChannels[channel].userId);
    }
    const channelJobsArr = await app.get('models').InspirationJob.findAll({ where: { userId: channelIds, teamId: user.teamId }});
    let channelJobs = {};
    for (let job in channelJobsArr) {
      channelJobs[channelJobsArr[job].userId] = channelJobsArr[job];
    }
    
    for (let channel in publicChannels) {
      publicChannels[channel].job = helpers.cronJobParser(channelJobs[publicChannels[channel].userId], Object.assign({}, defaultJob));
    }
    for (let channel in privateChannels) {
      privateChannels[channel].job = helpers.cronJobParser(channelJobs[privateChannels[channel].userId], Object.assign({}, defaultJob));
    }
    
    const timeValues= {};
    timeValues.hours = [...Array(24).keys()];
    timeValues.minutes = [...Array(60).keys()];
    
    let error = {};
    if (req.session.previousError) {
      error = req.session.previousError;
      delete req.session.previousError;
    }
    
    let flashMessage = '';
    if (req.session.flashMessage) {
      flashMessage = req.session.flashMessage;
      delete req.session.flashMessage;
    }
    
    return res.render('app', { 
      flashMessage: flashMessage, 
      user: user,
      team: team,
      publicChannels: publicChannels,
      privateChannels: privateChannels,
      timeValues: timeValues, 
      error: error 
    });
  });
  
  app.post('/messages/time', bodyParser.urlencoded({ extended: true }), async (req, res) => {    
    try {
      if (!req.user && !(req.user.userId && req.user.teamId)) {
        req.session.previousError = { message: 'user information not found.' };
        return res.redirect('/inspire');
      }
      
      let userId = req.user.userId;
      let teamId = req.user.teamId;
      
      let scheduleOpts = {
        userId: userId,
        teamId: teamId,
        models: app.get('models'),
        hours: req.body.hours,
        minutes: req.body.minutes,
        weekdaysOnly: req.body.weekdaysOnly
      };
      
      if (req.body.userId !== req.user.userId) {
        const channel = await app.get('models').User.findOne({ where: { userId: req.body.userId, teamId: teamId }});
        if (!channel || channel.teamId !== teamId || (channel.channelType === 'G' && channel.inviter !== userId)) {
          req.session.previousError = { message: 'you are not allowed to update this channel' };
          return res.redirect('/inspire');
        }
        
        scheduleOpts.userId = req.body.userId;
        scheduleOpts.inviterId = userId;
      }
      
      const success = scheduler.schedule(scheduleOpts);
      
      if (success) {
        req.session.flashMessage = 'congratulations, your settings were updated!';
        return res.redirect('/inspire');
      }
      throw new Error('unable to schedule your messages, please try again!')
    } catch (error) {
      console.log(error);
      req.session.previousError = error;
      return res.redirect('/inspire');
    }
  });
  
  app.get('/messages/delete', ensureLoggedIn('/login'), async (req, res) => {
    if (!req.user && !(req.user.userId && req.user.teamId)) {
      req.session.previousError = { message: 'user information not found.' };
      return res.redirect('/inspire');
    }
    
    try {
      const success = scheduler.delete({
        userId: req.user.userId,
        teamId: req.user.teamId,
        models: app.get('models')
      });

      if (success) {
        req.session.flashMessage = 'successfully removed your message queue. submit form to create a new one.';
        return res.redirect('/inspire');
      }
      req.session.flashMessage = 'could not find an existing message for you.';
      return res.redirect('/inspire');
    } catch (error) {
      console.log(error);
      req.session.previousError = error;
      return res.redirect('/inspire');
    }
  });
}

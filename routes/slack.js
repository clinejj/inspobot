const { createEventAdapter } = require('@slack/events-api');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { WebClient } = require('@slack/web-api');

const scheduler = require('../util/messageScheduler');
const content = require('../content/slack.json');

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET, { includeBody: true });
const slackInteractions = createMessageAdapter(process.env.SLACK_SIGNING_SECRET);

module.exports = (app) => {
  
  const channelJoinHandler = async (event, _body) => {  
    try {
      const team = await app.get('models').Team.findOne({ where: { teamId: event.team } });
      if (!team) {
        throw new Error(`Error retrieving team when bot joined ${event.channel} on ${event.team}`);
      }
      
      const web = new WebClient(team.botAccessToken);
      const channelInfo = await web.conversations.info({
        channel: event.channel
      });
      
      let channelName = '';
      if (channelInfo.ok) {
        channelName = channelInfo.channel.name;
      }

      const userCreate = await app.get('models').User.findOrCreate({
        where: {
          userId: event.channel,
          teamId: event.team
        },
        defaults: {
          channelType: event.channel_type,
          isChannel: true,
          inviter: event.inviter,
          name: channelName
        }
      });

      let text = 'Thanks for adding me! Please visit the <https://inspobot.glitch.me/inspire|site> to continue setup for this channel.';
      
      let blocks = content.timeSelectBlocks;
      
      let selectOptions = [];
      for (let hour in [...Array(24).keys()]) {
        for (let min = 0; min < 60; min += 15) {
          let displayHour = hour < 10 ? '0' + hour : hour;
          let displayMin = min < 10 ? '0' + min : min;
          selectOptions.push({
            text: {
              type: 'plain_text',
              text: `${displayHour}:${displayMin}`,
              emoji: true
            },
            value: `${hour}-${min}`
          });
        }
      }
      
      blocks[1].accessory.options = selectOptions;
      
      let blocksString = JSON.stringify(blocks);

      const message = await web.chat.postEphemeral({
        channel: event.channel,
        text: text,
        blocks: blocksString,
        user: event.inviter,
        as_user: true
      });
    } catch (error) {
      console.log(error);
    }
  };
  
  const removeChannelInfo = async(teamId, channelId, models) => {
    try {
      const user = await models.User.findOne({ where: { teamId: teamId, userId: channelId }});
      const jobDelete = scheduler.delete({ userId: channelId, teamId: teamId, models: models });

      if (user) {
        const destroyed = await user.destroy();
      }
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const channelLeaveHandler = async (event, body) => {
    const teamId = body.team_id;
    const channelId = event.channel;
    
    const removed = removeChannelInfo(teamId, channelId, app.get('models'));
  };
  
  const channelRenameHandler = async (event, body) => {
    try {
      let channel = await app.get('models').User.findOne({ where: { teamId: body.team_id, userId: event.channel.id }});
      
      if (channel) {
        channel.name = event.channel.name;
        channel = await channel.save();
      }
    } catch (error) {
      console.log(error);
    }
  };
  
  const channelArchiveHandler = async (event, body) => {
    const teamId = body.team_id;
    const channelId = event.channel;
    
    const removed = removeChannelInfo(teamId, channelId, app.get('models'));
  };
  
  const channelUnarchiveHandler = async (event, body) => {
    const teamId = body.team_id;
    const channelId = event.channel;
    
    try {
      const team = await app.get('models').Team.findOne({ where: { teamId: teamId} });
      if (!team) {
        throw new Error(`Error retrieving team when ${channelId} was unarchived in ${teamId}`);
      }

      // We'll just recreate the user record, but not prompt anyone to configure it again
      const web = new WebClient(team.botAccessToken);
      const channelInfo = await web.conversations.info({
        channel: channelId
      });
      
      let channelName = '';
      if (channelInfo.ok) {
        channelName = channelInfo.channel.name;
      }
      
      const userCreate = await app.get('models').User.findOrCreate({
        where: {
          userId: channelId,
          teamId: teamId
        },
        defaults: {
          channelType: channelId[0],
          isChannel: true,
          inviter: event.user,
          name: channelName
        }
      });
    } catch (error) {
      console.log(error);
    }
  };
  
  const channelDeleteHandler = async (event, body) => {
    const teamId = body.team_id;
    const channelId = event.channel;
    
    const removed = removeChannelInfo(teamId, channelId, app.get('models'));
  };
  
  const uninstallHandler = async (event, body) => {
    const teamId = body.team_id;
    
    console.log(`Received app_uninstall event for ${teamId}`);
    try {
      const jobs = await app.get('models').InspirationJob.findAll({ where: { teamId: teamId }});
      for (let idx in jobs) {
        let job = jobs[idx];
        const jobRemoved = scheduler.removeQueuedJob({ jobId: job.jobId, cron: job.cron, timeZone: job.timeZone });
      }
      
      const jobsDeleted = await app.get('models').InspirationJob.destroy({ where: { teamId: teamId }});
      const usersDeleted = await app.get('models').User.destroy({ where: { teamId: teamId }});
      const teamDeleted = await app.get('models').Team.destroy({ where: { teamId: teamId }});
      
      console.log(`${teamId} removed: ${jobsDeleted} jobs, ${usersDeleted} users, and ${teamDeleted} teams deleted`);
    } catch (error) {
      console.log(`Could not successfully uninstall ${teamId}, cleanup may be required`);
      console.log(error);
    }
  };

  slackEvents.on('error', (event, body) => {
    console.log('SLACK_ROUTE_ERROR');
    console.log(event);
    console.log(body);
  });
  
  slackEvents.on('member_joined_channel', channelJoinHandler);
  slackEvents.on('channel_left', channelLeaveHandler);
  slackEvents.on('group_left', channelLeaveHandler);
  slackEvents.on('channel_rename', channelRenameHandler);
  slackEvents.on('group_rename', channelRenameHandler);
  slackEvents.on('channel_archive', channelArchiveHandler);
  slackEvents.on('group_archive', channelArchiveHandler);
  slackEvents.on('channel_unarchive', channelUnarchiveHandler);
  slackEvents.on('group_unarchive', channelUnarchiveHandler);
  slackEvents.on('channel_deleted', channelDeleteHandler);
  slackEvents.on('group_deleted', channelDeleteHandler);
  slackEvents.on('app_uninstalled', uninstallHandler);
  
  slackInteractions.action({ actionId: 'timeSelect' }, async (payload, respond) => {
    const channelId = payload.channel.id;
    const teamId = payload.team.id;
    const inviterId = payload.user.id;
    const selection = payload.actions[0].selected_option.value;
    const [hour, min] = selection.split('-');
    
    try {      
      const jobScheduled = scheduler.schedule({
        userId: channelId,
        teamId: teamId,
        inviterId: inviterId,
        models: app.get('models'),
        hours: hour,
        minutes: min,
        weekdaysOnly: true
      });

      if (!jobScheduled) {
        console.log('Error scheduling job');
      }

      let text = 'Thanks for adding me! Please visit the <https://inspobot.glitch.me/inspire|site> to continue setup for this channel.';
      let blocks = content.daySelectBlocks;

      let blocksString = JSON.stringify(blocks);

      respond({
        replace_original: true,
        text: text,
        blocks: blocksString
      });
    } catch (error) {
      console.log(error);
      respond({
        replace_original: true,
        text: 'Whoops, we ran into an error. Please visit the <https://inspobot.glitch.me/inspire|website> to finish setting up.'
      });
    }
  });
  
  slackInteractions.action({ actionId: 'daysSelect' }, async (payload, respond) => {
    const channelId = payload.channel.id;
    const teamId = payload.team.id;
    const inviterId = payload.user.id;
    const selection = payload.actions[0].selected_option.value;
    
    try {
      const existingJob = await app.get('models').InspirationJob.findOne({ where: { userId: channelId, teamId: teamId }});
      
      if (!existingJob) {
        throw new Error(`Could not find existing job for ${teamId}-${channelId}`);
      }
      
      let cronSplit = existingJob.cron.split(' ');
      let hour = cronSplit[2];
      let min = cronSplit[1];
      
      const jobScheduled = scheduler.schedule({
        userId: channelId,
        teamId: teamId,
        inviterId: inviterId,
        models: app.get('models'),
        hours: hour,
        minutes: min,
        weekdaysOnly: selection !== '?'
      });

      if (!jobScheduled) {
        console.log('Error scheduling job');
      }
      
      respond({
        replace_original: true,
        text: 'Thanks! You\'re now getting daily inspiration 😃🎉',
        emoji: true
      });
    } catch (error) {
      console.log(error);
      respond({
        replace_original: true,
        text: 'Whoops, we ran into an error. Please visit the <https://inspobot.glitch.me/inspire|website> to finish setting up.'
      });
    }

  });
  
  app.use('/slack/events', slackEvents.expressMiddleware());
  
  app.use('/slack/actions', slackInteractions.expressMiddleware());
}

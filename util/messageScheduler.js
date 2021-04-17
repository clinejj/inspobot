const queue = require('bull');
const config = require('../config/config').redis;
const messageQueue = new queue('post_messages', {redis: config });

const { WebClient } = require('@slack/web-api');
/*
 * This method schedules a recurring message job for the userId passed in.
 * Fields used in method:
 *   userId: user ID of the channel or user to message
 *   teamId: team ID of the team the channel or user is in
 *   models: the models singleton
 *   inviterId: (optional) if the userId is a channel, the person who invited
 *   hours: the hour to send the message
 *   minutes: the minutes to send the message
 *   weekdaysOnly: whether to include weekends
 *
 * NOTE: this method does no error handling, so calling methods should be aware
 * This method will also throw various errors if required information isn't present
 */
exports.schedule = async (req) => {
  if (!(req.userId && 
        req.teamId && 
        req.models)) {
    throw new Error('Required information not passed to schedule()');
  }
  
  if (!(req.hours && req.minutes)) {
    throw new Error('Scheduling information not passed to schedule()');
  }

  const jobId = `${req.teamId}${req.userId}`;
  const startDate = Date.now();

  const team = await req.models.Team.findOne({ where: { teamId: req.teamId }});
  if (!team) {
    throw new Error(`Could not find team passed to schedule(): ${req.teamId}`)
  }

  const web = new WebClient(team.botAccessToken);

  let userMeta = {};
  const slackResponse = await web.users.info({
    user: req.inviterId ? req.inviterId : req.userId,
    include_locale: true
  });

  if (slackResponse.ok) {
    userMeta = slackResponse.user;
    // Let's update the user with the data we just received
    let userDb = await req.models.User.findOne({ where: { userId: userMeta.id, teamId: req.teamId }});
    userDb.name = userMeta.profile.real_name;
    userDb.displayName = userMeta.profile.display_name;
    userDb = await userDb.save();
  } else {
    throw new Error(`Could not retrive timezone info from Slack for ${req.inviterId ? req.inviterId : req.userId}`);
  }

  const days = req.weekdaysOnly ? 'MON-FRI' : '?';

  let cronString = `0 ${req.minutes} ${req.hours} * * ${days}`;
  let timezone = userMeta.tz;

  let inspireJob = await req.models.InspirationJob.findOne({ 
    where: { 
      teamId: req.teamId,
      userId: req.userId
    }
  });

  // if job exists, delete job in queue
  if (inspireJob) {
    const result = await messageQueue.removeRepeatable({
      jobId: inspireJob.jobId,
      cron: inspireJob.cron,
      tz: inspireJob.timeZone
    });
  }

  const job = await messageQueue.add({teamId: req.teamId, userId: req.userId}, { 
    jobId: jobId,
    removeOnComplete: true,
    repeat: {
      cron: cronString,
      tz: timezone,
      startDate: startDate
    }
  });

  if (inspireJob) {
    inspireJob.jobId = jobId;
    inspireJob.cron = cronString;
    inspireJob.timeZone = timezone;
    inspireJob = await inspireJob.save();
  } else {
    inspireJob = await req.models.InspirationJob.create({
      jobId: jobId,
      cron: cronString,
      timeZone: timezone,
      teamId: req.teamId,
      userId: req.userId
    });
  }

  return true;
}

/*
 * Input object must contain:
 *   userId: userId of the message being sent to
 *   teamId: teamId of the team the user is in
 *   models: the models singleton
 *
 * NOTE: This method does no error handling, calling functions should handle their own errors
 */
exports.delete = async (req) => {
  if (!(req.userId && req.teamId && req.models)) {
    throw new Error('Required information not passed to delete()');
  }
    
  let inspireJob = await req.models.InspirationJob.findOne({ 
    where: { 
      teamId: req.teamId,
      userId: req.userId
    }
  });

  if (inspireJob) {
    const result = await messageQueue.removeRepeatable({
      jobId: inspireJob.jobId,
      cron: inspireJob.cron,
      tz: inspireJob.timeZone
    });
    const destroyed = await inspireJob.destroy();

    return true;
  }
  return false;
}

exports.removeQueuedJob = async (req) => {
  return await messageQueue.removeRepeatable({
    jobId: req.jobId,
    cron: req.cron,
    tz: req.timeZone
  });
};
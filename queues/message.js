const { WebClient } = require('@slack/web-api');
const models = require('../models');
const quotes = require('../content/quotes.json');

module.exports = async (job) => {
  const teamId = job.data.teamId;
  const userId = job.data.userId;
  
  const quoteIndex = Math.floor(Math.random() * quotes.quotes.length);
  
  try {
    const teamQuery = models.Team.findOne({ where: { teamId: teamId } });
    const userQuery = models.User.findOne({ where: { teamId: teamId, userId: userId }});
    const inspirationJobQuery = models.InspirationJob.findOne({  where: { teamId: teamId, userId: userId }});
    
    const [team, user, inspirationJob] = await Promise.all([teamQuery, userQuery, inspirationJobQuery]);
    
    if (!team || !team.botAccessToken) {
      throw new Error(`Could not find entry for team ${teamId} with user ${userId}`);
    }
    const web = new WebClient(team.botAccessToken);
    
    let text = quotes.quotes[quoteIndex];
    
    if (user && inspirationJob) {
      let greeting = quotes.greetings.goodMorning;
      let hour = parseInt(inspirationJob.cron.split(' ')[2]);
      if (hour >= 12 && hour < 17) {
        greeting = quotes.greetings.goodAfternoon;
      } else if (hour >= 17 || hour < 4) {
        greeting = quotes.greetings.goodEvening;
      }
      
      let name = user.displayName ? user.displayName : user.name;
      if (user.isChannel) {
        text = `${greeting}! ${text}`;
      } else {
        text = `${greeting} ${name}! ${text}`;
      }
    }
    
    const message = await web.chat.postMessage({
      channel: userId,
      text: text,
      as_user: true
    });
    console.log(`Message sent to ${teamId} - ${userId}`);
    job.progress(100);
    return Promise.resolve(message);
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
};
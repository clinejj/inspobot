const basicAuth = require('express-basic-auth');

module.exports = (app) => {
  
  const authConfig = { users: {}, challenge: true, realm: process.env.AUTH_REALM };
  authConfig.users[process.env.QUEUE_ADMIN_NAME] = process.env.QUEUE_ADMIN_PASSWORD;

  app.use('/admin', basicAuth(authConfig));
  
  app.get('/admin/users', async (req, res) => {
    const users = await app.get('models').User.findAll({ raw: true });
    
    const keys = Object.keys(users[0]);
    
    res.render('admin', { models: users, keys: keys, users: true, teams: false, jobs: false });
  });
  
  app.get('/admin/teams', async (req, res) => {
    const teams = await app.get('models').Team.findAll({ raw: true });
    
    const keys = Object.keys(teams[0]);
    
    res.render('admin', { models: teams, keys: keys, teams: true, users: false, jobs: false });
  });
  
  app.get('/admin/jobs', async (req, res) => {
    const jobs = await app.get('models').InspirationJob.findAll({ raw: true });
    
    const keys = Object.keys(jobs[0]);
    
    res.render('admin', { models: jobs, keys: keys, jobs: true, users: false, teams: false });
  });
}
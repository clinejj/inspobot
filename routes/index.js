const helpers = require('../util/helpers');
const randomString = require('randomstring');

module.exports = (app, redisClient) => {
  
  app.get('/', async (req, res) => {
    let team = '';
    if (req.isAuthenticated()) {
      team = await app.get('models').Team.findOne({ where: { teamId: req.user.teamId }});
    }
    
    res.render('index', { user: req.user, team: team });
  });
};

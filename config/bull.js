const Bull = require('bull');
const Arena = require('bull-arena');
const config = require('../config/config').redis;

const basicAuth = require('express-basic-auth');

const maintenanceQueue = new Bull('maintenance', {redis: config});
const messageQueue = new Bull('post_messages', {redis: config });

const maintenanceProcessors = require('../queues/maintenance');

module.exports = (app) => {
  maintenanceQueue.process('keep_alive', maintenanceProcessors.keepAlive);
  messageQueue.process('/app/queues/message.js');
  
  // Schedule the keep alive job for every two minutes
  maintenanceQueue.add('keep_alive', {}, { 
    jobId: 'keep_alive',
    removeOnComplete: true,
    repeat: { 
      cron: '0 */2 * ? * *', 
      startDate: Date.now() 
    }
  });
  
  const authConfig = { users: {}, challenge: true, realm: process.env.AUTH_REALM };
  authConfig.users[process.env.QUEUE_ADMIN_NAME] = process.env.QUEUE_ADMIN_PASSWORD;

  app.use('/admin/queues', basicAuth(authConfig));

  const redisConfig = { port: process.env.REDIS_PORT, host: process.env.REDIS_HOST };
  
  const arenaConfig = Arena({
    Bull,
    queues: [
      {
        name: "post_messages",
        hostId: "Messages",
        type: 'bull',
        redis: redisConfig
      },
      {
        name: "maintenance",
        hostId: "Maintenance",
        type: 'bull',
        redis: redisConfig
      }
    ]
  },
  {
    basePath: '/admin/queues',
    disableListen: true
  });
  app.use('/', arenaConfig);
}
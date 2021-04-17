module.exports = {
  sequelize: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: '127.0.0.1',
    dialect: 'sqlite',
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    logging: false, // Remove this line to log sequelize queries to console
    storage: '.data/database.sqlite'
  },
  redis: {
    port: process.env.REDIS_PORT, 
    host: process.env.REDIS_HOST
  }
};

const express = require('express');

const bullConfig = require('./config/bull');
const models = require('./models');

const redisClient = require('./config/redis');

// Express app setup
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const passport = require('passport');
const passportConfig = require('./config/passport');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

const adminRoutes = require('./routes/admin');
const appRoutes = require('./routes/app');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const installRoutes = require('./routes/install');
const slackRoutes = require('./routes/slack');

const app = express();

// Must set up slack event listener first
slackRoutes(app);

bullConfig(app);
passportConfig(passport, models);

app.set('trust proxy', 1);
app.use(express.static('public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: (90 * 24 * 3600000),
      secure: true
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Make models available as ~singleton so we can better reuse connections
// See https://www.redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html for details
app.set('models', models);

adminRoutes(app);
appRoutes(app, passport);
authRoutes(app, passport);
indexRoutes(app, redisClient);
installRoutes(app, redisClient);

try {
  models.sequelize.sync().then(() => {
    const server = app.listen(process.env.PORT, function() {
      console.log('Your app is listening on port ' + server.address().port);
    });
  });
} catch (error) {
  console.log('Failedto start app.');
  console.log(error);
}


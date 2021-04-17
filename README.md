Inspobot
=================

A Slackbot that provides daily motivation and inspiration.

The goal:
- Users can sign up a slack workspace and configure a daily message
- Configuration options include time of day, and channel/user to send message to
- Users can invite the bot into a channel, where the bot will post to the channel

For now, inspiration/motivation list hardcoded into DB and pulled at random

Future improvements:
- Do not reuse motivation quotes (keep track of last 5 and don't show one of those)
- Integrate with Google Assistant to add to a routine
- Ability to add custom messages per workspace/user

TODO:
- Add a nicer UX on the website

## About
This Slackbot uses a basic webapp powered by Express to configure a Slack bot that sends a daily message. It uses:
- Bull for job scheduling (with Arena to view queued jobs)
- Passport for authentication with Slack's OAuth
- Redis for the datastore for Bull and session storage
- Sequelize and SQLite3 DB for user/team information

## To Remix:
Are you going to remix this? Dope! Follow these steps to get setup.
1) Remix into your own project
2) Follow these notes to get Redis up and running your Glitch app: <https://glitch.com/~redis-notes>
3) Create your Slack app (see here: <https://api.slack.com/slack-apps#creating_apps>)
4) Copy .env.sample to your .env and update your properties
5) Update views/components/footer.ejs to include your made by information
6) To subscribe to the events API in Slack, you must change the "start" parameter in package.json to "npm run slack-verify" in order to verify your URL

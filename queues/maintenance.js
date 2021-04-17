const fetch = require('node-fetch');

const keepAlive = async (job) => {
  try {
    let response = await fetch(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
    let date = new Date();
    let timeString = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    job.progress(100);
    return Promise.resolve(timeString);
  } catch (error) {
    console.log(error);
    return Promise.reject(error);
  }
};

module.exports = {
  keepAlive: keepAlive
}

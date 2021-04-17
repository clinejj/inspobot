exports.getUrlWithParams = (url, params) => {
  if(url.indexOf('?') < 0) url += '?'
  url += Object.keys(params).map((key) => key+'='+params[key]).join('&')
  return url
};

exports.cronJobParser = (job, defaultJob) => {
  let parsedJob = defaultJob ? defaultJob : {};
  if (!job) {
    return Object.assign({}, defaultJob);
  }
  
  let cronParts = job.cron.split(' ');
  parsedJob.hour = parseInt(cronParts[2]);
  parsedJob.minute = parseInt(cronParts[1]);
  if (cronParts[5] === 'MON-FRI') {
    parsedJob.weekdaysOnly = true;
  }
  
  return parsedJob;
};

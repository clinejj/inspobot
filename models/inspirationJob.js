module.exports = (sequelize, DataTypes) => {
  var InspirationJob = sequelize.define('InspirationJob', {
    jobId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true
    },
    cron: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timeZone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    teamId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['jobId'] },
      { unique: true, fields: [ 'userId', 'teamId' ] },
      { fields: ['userId'] },
      { fields: ['teamId'] }
    ]
  });

  return InspirationJob;
};
module.exports = (sequelize, DataTypes) => {
  var Team = sequelize.define('Team', {
    accessToken: {
      type: DataTypes.STRING,
      unique: true
    },
    scope: DataTypes.STRING,
    teamName: DataTypes.STRING,
    teamId: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true
    },
    botUserId: DataTypes.STRING,
    botAccessToken: {
      type: DataTypes.STRING,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['teamId'] }
    ]
  });

  return Team;
};
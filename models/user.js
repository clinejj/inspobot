module.exports = (sequelize, DataTypes) => {
  var User = sequelize.define('User', {
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'userTeamId',
      primaryKey: true
    },
    teamId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'userTeamId',
      primaryKey: true
    },
    name: DataTypes.STRING,
    displayName: DataTypes.STRING,
    isChannel: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    channelType: DataTypes.STRING,
    inviter: DataTypes.STRING
  }, {
    indexes: [
      { unique: true, fields: [ 'userId', 'teamId' ] },
      { fields: ['userId'] },
      { fields: ['teamId'] },
      { fields: ['inviter'] }
    ]
  });

  return User;
};
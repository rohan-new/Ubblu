'use strict'

module.exports = (sequelize, DataTypes) => {
  const UserChannelRelationship = sequelize.define(
    'UserChannelRelationship',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      channel_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      pinned:{
        type: DataTypes.BOOLEAN,
        allowNullL: false,
        defaultValue: false
      },
      status: {
        type: DataTypes.ENUM('ADMIN', 'MEMBER', 'BLOCKED', 'NONE'),
        defaultValue: 'NONE'
      },
      is_receive_mail_notification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: 'user-channel-relationships'
    }
  )

  UserChannelRelationship.associate = function({
    User,
    Channel,
    UserChannelRelationship
  }) {
    User.hasMany(UserChannelRelationship)
    UserChannelRelationship.belongsTo(User)
    Channel.hasMany(UserChannelRelationship)
    UserChannelRelationship.belongsTo(Channel)
  }

  return UserChannelRelationship
}

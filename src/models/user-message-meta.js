'use strict'

module.exports = (sequelize, DataTypes) => {
  const MessageMeta = sequelize.define(
    'UserMessageMeta',
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
      other_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      channel_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      last_message_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      notes: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      is_muted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_tagged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_starred: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: 'user-message-meta'
    }
  )

  MessageMeta.associate = function({
    User,
    Channel,
    Message,
    Workspace,
    UserMessageMeta
  }) {
    UserMessageMeta.belongsTo(User)
    UserMessageMeta.belongsTo(Channel)
    UserMessageMeta.belongsTo(Workspace)
    UserMessageMeta.belongsTo(Message, {
      foreignKey: 'last_message_id',
      as: 'lastMessage'
    })
    UserMessageMeta.belongsTo(User, {
      foreignKey: 'other_user_id',
      as: 'otherUser'
    })
  }

  return MessageMeta
}

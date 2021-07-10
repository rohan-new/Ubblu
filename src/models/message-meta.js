'use strict'

module.exports = (sequelize, DataTypes) => {
  const MessageMeta = sequelize.define(
    'MessageMeta',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      message_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      metaKey: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      metaValue: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'message-meta'
    }
  )

  MessageMeta.associate = function({ Message, MessageMeta }) {
    Message.hasMany(MessageMeta)
    MessageMeta.belongsTo(Message)
  }

  return MessageMeta
}

'use strict'

const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => { 
  const Message = sequelize.define(
    'Message',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      }, 
      message: {
        type: DataTypes.STRING,
        defaultValue: ''
      },
      messageType: {
        type: DataTypes.ENUM('IMAGE', 'TEXT', 'FILE', 'MARKDOWN', 'YOUTUBE'),
        defaultValue: 'TEXT'
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      receiver_id: {
        type: DataTypes.INTEGER,
        allowNull: true // Null in case of channel message
      },
      channel_id: {
        type: DataTypes.INTEGER,
        allowNull: true // Null in case of direct message
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: true // Null in case of channel message
      },
     
      is_pinned: {
        type: DataTypes.BOOLEAN,
        allowNullL: false,
        defaultValue: false
      },
      pinned_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      pinned_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deleted: {
        type: DataTypes.BOOLEAN
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      tagged_id: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true // Null in case of No Tagged
      }
    },
    {
      tableName: 'messages'
    }
  )

  Message.associate = function() {}

  return Message
}

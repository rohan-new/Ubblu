'use strict'
const Sequelize = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  const ChannelNotes = sequelize.define(
    'ChannelNotes',
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
        allowNull: true
      },
      notes: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      deleted: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
    },
    {
      tableName: 'channel-notes'
    }
  )

  ChannelNotes.associate = function({ User, Channel }) {
    ChannelNotes.belongsTo(User)
    ChannelNotes.belongsTo(Channel)
  }

  return ChannelNotes
}

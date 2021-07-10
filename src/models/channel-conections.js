'use strict'
const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const ChannelConnections = sequelize.define(
    'ChannelConnections',
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
      room_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      socket_id: {
        type: DataTypes.STRING,
        defaultValue: null
      },

    },
    {
      tableName: 'connections'
    }
  )

  ChannelConnections.associate = function ({
    User,
    Channel,
    ChannelConnections
  }) {
    User.hasMany(ChannelConnections)
    ChannelConnections.belongsTo(User)
    Channel.hasMany(ChannelConnections)
    ChannelConnections.belongsTo(Channel)
  }

  return ChannelConnections
}

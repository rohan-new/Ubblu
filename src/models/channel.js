'use strict'

const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const Channel = sequelize.define(
    'Channel',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true
      },
      visibility: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      auto_join: {
        type: DataTypes.ENUM('ANYONE', 'ANY GUEST USER', 'ANY EMPLOYEE', 'NONE'),
        allowNull: false,
        defaultValue: 'NONE'
      },
      invite_link: {
        type: DataTypes.STRING,
        allowNull: false
      },
      channel_type: {
        type: DataTypes.ENUM('PRIVATE', 'SECRET', 'PUBLIC'),
        defaultValue: 'PUBLIC'
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      colors: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'channels'
    }
  )

  Channel.associate = function () { }

  return Channel
}

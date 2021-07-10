'use strict'

const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const ExceptionList = sequelize.define(
    'ExceptionList',
    {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      userid: {
        type: Sequelize.INTEGER
      },
      channelid: {
        type: Sequelize.INTEGER
      },
      workspace_id: {
        type: Sequelize.INTEGER
      },
      exceptionerid: {
        type: Sequelize.INTEGER
      },
    },
    {
      tableName: 'exceptionlist'
    }
  )

  ExceptionList.associate = function () { }

  return ExceptionList
}
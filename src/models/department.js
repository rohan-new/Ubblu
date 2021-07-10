'use strict'

const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    'Department',
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
      default: {
        type: DataTypes.BOOLEAN,
        allowNull: false
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
      }
    },
    {
      tableName: 'departments'
    }
  )

  Department.associate = function () { }

  return Department
}

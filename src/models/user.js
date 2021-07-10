'use strict'

const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      note: {
        type: DataTypes.STRING,
        allowNull: true
      },
      profile_image: {
        type: DataTypes.STRING,
        allowNull: true
      },
      availability: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      cloud_storage: {
        type: DataTypes.ENUM('GOOGLE-DRIVE', 'DROPBOX'),
        defaultValue: 'GOOGLE-DRIVE'
      },
      is_cookie:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
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
      profile_color: {
        type: DataTypes.STRING,
        defaultValue: ''
      },
    },
    {
      tableName: 'users'
    }
  )

  User.associate = function () { }

  return User
}

'use strict'

const Sequelize = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  const Workspace = sequelize.define(
    'Workspace',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      allow_new_registration: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      description: {
        type: DataTypes.STRING,
        defaultValue: ''
      },
      workspace_type: {
        type: DataTypes.ENUM('PUBLIC', 'PERSONAL'),
        defaultValue: 'PUBLIC'
      },
      default_user_type: {
        type: DataTypes.ENUM('SUPERADMIN', 'ADMIN', 'GUEST USER', 'EMPLOYEE'),
        defaultValue: 'GUEST USER'
      },
      email_tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
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
      }
    },
    {
      tableName: 'workspaces'
    }
  )

  Workspace.associate = function ({ Workspace, User }) {
    User.hasMany(Workspace, { foreignKey: 'created_by', as: 'workspaces' })
    Workspace.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })
  }

  return Workspace
}

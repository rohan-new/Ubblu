'use strict'

module.exports = (sequelize, DataTypes) => {
  const UserWorkspaceRelationship = sequelize.define(
    'UserWorkspaceRelationship',
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
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM(
          'SUPERADMIN',
          'ADMIN',
          'BLOCKED',
          'MEMBER',
          'EMPLOYEE',
          'NONE'
        ),
        defaultValue: 'NONE'
      },
      is_suspended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      notification_frequency: {
        type: DataTypes.ENUM(
          '0',
          '15',
          '30',
          '60',
          '1440'

        ),
        defaultValue: '0'
      },
      email_notifications: {
        type: DataTypes.ENUM('15', '60', '0'),
        defaultValue: '15'
      },
      ubblu_tips: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      ubblu_news_announcement: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      keywords: {
        type: DataTypes.STRING,
        defaultValue: ''
      }
    },
    {
      tableName: 'user-workspace-relationships'
    }
  )

  UserWorkspaceRelationship.associate = function ({
    User,
    Workspace,
    UserWorkspaceRelationship,
    Department
  }) {
    User.hasMany(UserWorkspaceRelationship, {
      as: 'user_workspace_relationships'
    })
    UserWorkspaceRelationship.belongsTo(User, { as: 'user' })

    Workspace.hasMany(UserWorkspaceRelationship, {
      as: 'user_workspace_relationships'
    })
    UserWorkspaceRelationship.belongsTo(Workspace, { as: 'workspace' })

    Department.hasMany(UserWorkspaceRelationship)
    UserWorkspaceRelationship.belongsTo(Department)
  }

  return UserWorkspaceRelationship
}

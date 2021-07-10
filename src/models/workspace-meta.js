'use strict'

module.exports = (sequelize, DataTypes) => {
  const WorkspaceMeta = sequelize.define(
    'WorkspaceMeta',
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
      meta_key: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      meta_value: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'workspace-meta'
    }
  )

  WorkspaceMeta.associate = function({ Workspace, WorkspaceMeta }) {
    Workspace.hasMany(WorkspaceMeta)
    // WorkspaceMeta.belongsTo(Workspace, { as: 'metadata' })
  }

  return WorkspaceMeta
}

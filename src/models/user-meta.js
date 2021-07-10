'use strict'

module.exports = (sequelize, DataTypes) => {
  const UserMeta = sequelize.define(
    'UserMeta',
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
      metaKey: {
        type: DataTypes.STRING,
        allowNull: false
      },
      metaValue: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: 'user-meta'
    }
  )

  UserMeta.associate = function({ User, UserMeta }) {
    User.hasMany(UserMeta)
    UserMeta.belongsTo(User)
  }

  return UserMeta
}

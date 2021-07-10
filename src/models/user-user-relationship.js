'use strict'

module.exports = (sequelize, DataTypes) => {
  const UserUserRelationship = sequelize.define(
    'UserUserRelationship',
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
      otherUserId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('FRIEND', 'BLOCKED', 'NONE'),
        defaultValue: 'NONE'
      }
    },
    {
      tableName: 'user-user-relationships'
    }
  )

  UserUserRelationship.associate = function({ User, UserUserRelationship }) {
    User.hasMany(UserUserRelationship)
    UserUserRelationship.belongsTo(User)
    User.hasMany(UserUserRelationship, { foreignKey: 'otherUserId' })
    UserUserRelationship.belongsTo(User, { foreignKey: 'otherUserId' })
  }

  return UserUserRelationship
}

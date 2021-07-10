'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('user-workspace-relationships', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      workspace_id: { 
        type: Sequelize.INTEGER,
        allowNull: false
      }, 
      status: {
        type: Sequelize.ENUM(
          'SUPERADMIN',
          'ADMIN',
          'BLOCKED',
          'MEMBER',
          'EMPLOYEE',
          'NONE'
        ),
        defaultValue: 'NONE'
      }
    })
  },

  down: queryInterface => {
    return queryInterface.dropTable('user-workspace-relationships')
  }
}

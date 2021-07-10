'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('user-user-relationships', {
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
      other_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('FRIEND', 'BLOCKED', 'NONE'),
        defaultValue: 'NONE'
      }
    })
  },

  down: queryInterface => {
    return queryInterface.dropTable('user-user-relationships')
  }
}

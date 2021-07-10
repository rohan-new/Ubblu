'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('user-channel-relationships', {
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
      channel_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('MEMBER', 'BLOCKED', 'NONE'),
        defaultValue: 'NONE'
      }
    })
  },

  down: queryInterface => {
    return queryInterface.dropTable('user-channel-relationships')
  }
}

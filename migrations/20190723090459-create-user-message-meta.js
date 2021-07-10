'use strict'
const tableName = 'user-message-meta'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
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
        allowNull: true
      },
      channel_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      workspace_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      notes: {
        type: Sequelize.STRING,
        allowNull: true
      },
      last_message_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      }
    })
  },

  down: queryInterface => {
    return queryInterface.dropTable(tableName)
  }
}

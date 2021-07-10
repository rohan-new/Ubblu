'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('messages', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      message: {
        type: Sequelize.STRING,
        defaultValue: ''
      },
      message_type: {
        type: Sequelize.ENUM('IMAGE', 'TEXT', 'FILE', 'MARKDOWN', 'YOUTUBE'),
        defaultValue: 'TEXT'
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      channel_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      deleted: {
        type: Sequelize.BOOLEAN
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    })
  },

  down: queryInterface => {
    return queryInterface.dropTable('messages')
  }
} 
 
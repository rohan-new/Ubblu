'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('channel-meta', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      channel_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      meta_key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      meta_value: {
        type: Sequelize.STRING
      }
    })
  },

  down: queryInterface => {
    return queryInterface.dropTable('channel-meta')
  }
}

'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('workspace-meta', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      workspace_id: {
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
    return queryInterface.dropTable('workspace-meta')
  }
}

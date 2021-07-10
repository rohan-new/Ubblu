'use strict'
const tableName = 'user-message-meta'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'is_muted', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      await queryInterface.addColumn(tableName, 'is_tagged', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      await queryInterface.addColumn(tableName, 'is_starred', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn(tableName, 'is_muted'),
      await queryInterface.removeColumn(tableName, 'is_tagged'),
      await queryInterface.removeColumn(tableName, 'is_starred')
    ]
  }
}

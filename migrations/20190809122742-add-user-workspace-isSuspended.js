'use strict'
const tableName = 'user-workspace-relationships'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'is_suspended', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      })
    ]
  },

  down: async queryInterface => {
    return [await queryInterface.removeColumn(tableName, 'is_suspended')]
  }
}

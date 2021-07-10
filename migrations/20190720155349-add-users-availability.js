'use strict'
const tableName = 'users'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'availability', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      })
    ]
  },

  down: async queryInterface => {
    return [await queryInterface.removeColumn(tableName, 'availability')]
  }
}

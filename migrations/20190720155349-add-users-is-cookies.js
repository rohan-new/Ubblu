'use strict'
const tableName = 'users'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'is_cookie', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      })
    ]
  },

  down: async queryInterface => {
    return [await queryInterface.removeColumn(tableName, 'is_cookie')]
  }
}

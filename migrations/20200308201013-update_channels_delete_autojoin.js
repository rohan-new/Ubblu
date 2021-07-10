'use strict'
const tableName = 'channels'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.removeColumn(tableName, 'auto_join')
  },

  down: async queryInterface => {
    return await queryInterface.addColumn(tableName, 'auto_join')
  }
}

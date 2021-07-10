'use strict'
const tableName = 'connections'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'socket_id', {
        type: Sequelize.STRING,
        defaultValue: null
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn(tableName, 'socket_id')
    ]
  }
}

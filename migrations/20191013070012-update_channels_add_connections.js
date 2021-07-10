'use strict'
const tableName = 'channels'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'channels', {
        type: Sequelize.ARRAY(Sequelize.JSONB),
        defaultValue: []
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn(tableName, 'channels')
    ]
  }
}

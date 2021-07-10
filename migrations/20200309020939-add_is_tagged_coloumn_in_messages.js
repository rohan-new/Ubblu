'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('messages', 'is_tagged', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'is_tagged')
    ]
  }
}

'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('departments', 'default', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('departments', 'default')
    ]
  }
}

'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('user-workspace-relationships', 'availability', {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      })
    ]
  }, 

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('user-workspace-relationships', 'availability')
    ]
  }
}

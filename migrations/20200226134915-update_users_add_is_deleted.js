'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('user-workspace-relationships', 'is_deleted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('user-workspace-relationships', 'is_deleted')
    ]
  }
}

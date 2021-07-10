'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [

      await queryInterface.addColumn('user-channel-relationships', 'muted', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }),
      await queryInterface.addColumn('user-channel-relationships', 'starred', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      })

    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('user-channel-relationships', 'muted'),
      await queryInterface.removeColumn('user-channel-relationships', 'starred'),

    ]
  }
}

'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [

      await queryInterface.addColumn('channels', 'auto_join', {
        type: Sequelize.ENUM(
          'ANYONE',
          'ANY GUEST USER',
          'ANY EMPLOYEE'
        ),
        defaultValue: 'ANYONE'
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('channels', 'auto_join'),
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_channels_auto_join";')

    ]
  }
}

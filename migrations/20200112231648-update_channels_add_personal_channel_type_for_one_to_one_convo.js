'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.sequelize.query("ALTER TYPE enum_channels_channel_type ADD VALUE 'PERSONAL';")
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('channels', 'channel_type'),
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_channels_channel_type";')

    ]
  }
}

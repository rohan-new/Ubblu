'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [

      await queryInterface.addColumn('users', 'cloud_storage', {
        type: Sequelize.ENUM(
          'GOOGLE-DRIVE',
          'DROPBOX'
        ),
        defaultValue: 'GOOGLE-DRIVE'
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('users', 'cloud_storage'),
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_cloud-storage";')

    ]
  }
}

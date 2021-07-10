'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
     
      await queryInterface.addColumn('messages', 'thumbnail_blob', {
        type: Sequelize.BLOB,
        allowNull: true
      }),
      await queryInterface.addColumn('messages', 'file_upload_service_method', {
        type: Sequelize.ENUM(
          'GOOGLE-DRIVE',
          'DROPBOX',
          'NONE'
        ),
        defaultValue: 'NONE'
      })

    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'thumbnail_blob'),
      await queryInterface.removeColumn('messages', 'file_upload_service_method'),
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_file_upload_service_method";')

    ]
  }
}

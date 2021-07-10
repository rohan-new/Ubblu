'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {

    queryInterface.describeTable('messages')
      .then(tableDefinition => {
        if (tableDefinition.file_upload_details) return Promise.resolve();

        return queryInterface.addColumn('messages', 'file_upload_details', {
          type: Sequelize.JSONB,
          allowNull: true
        });
      });


  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'file_upload_details'),
    ]
  }
}
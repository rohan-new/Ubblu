'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {

    queryInterface.describeTable('messages')
      .then(tableDefinition => {
        console.log('tableDefinition.read_status', tableDefinition.read_status);
        if (tableDefinition.read_status) return Promise.resolve();

        return queryInterface.addColumn('messages', 'read_status', {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        });
      });


  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'read_status')

    ]
  }
}
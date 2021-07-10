'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn('channel-notes', 'deleted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    })
  },

  down: async (queryInterface) => {
    return await queryInterface.removeColumn('channel-notes', 'deleted')
  }
};

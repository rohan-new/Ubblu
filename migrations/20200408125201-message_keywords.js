'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn('user-workspace-relationships', 'keywords', {
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface) => {
    return await queryInterface.dropColumn('user-workspace-relationships', 'keywords')
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn('token_logs', 'workspace_id', {
      type: Sequelize.INTEGER,
    })
  },

  down: async (queryInterface) => {
    return await queryInterface.dropColumn('token_logs', 'workspace_id')
  }
};

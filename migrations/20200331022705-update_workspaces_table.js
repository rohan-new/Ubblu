'use strict';

module.exports = {
  up: async(queryInterface, Sequelize) => {
    return [
      await queryInterface.removeColumn('workspaces', 'must_have_email'),
      await queryInterface.addColumn('workspaces', 'email_tags', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: null
      })
    ]
  },

  down: async(queryInterface) => {
    return [
      await queryInterface.removeColumn('workspaces', 'must_have_email'),
      await queryInterface.removeColumn('workspaces', 'email_tags')
    ]
  }
};

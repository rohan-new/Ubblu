'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn('user-channel-relationships', 'unread_msgs_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    })
  },

  down: async (queryInterface) => {
    return await queryInterface.dropColumn('user-channel-relationships', 'unread_msgs_count')
  }
};

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('exceptionlist', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      userid: {
        type: Sequelize.INTEGER
      },
      channelid: {
        type: Sequelize.INTEGER
      },
      workspace_id: {
        type: Sequelize.INTEGER
      },
      exceptionerid: {
        type: Sequelize.INTEGER
      },
    })
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('exceptionlist')
  }
};

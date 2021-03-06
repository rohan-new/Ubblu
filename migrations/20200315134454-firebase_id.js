'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'users', 'firebase_id', {
      type: Sequelize.STRING,
      allowNull: true
    })
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('users', 'firebase_id')
  }
};

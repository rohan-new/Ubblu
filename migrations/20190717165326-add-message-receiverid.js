'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('messages', 'receiver_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    })
  },

  down: queryInterface => {
    return queryInterface.removeColumn('messages', 'receiver_id')
  }
}

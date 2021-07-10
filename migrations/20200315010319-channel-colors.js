  'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'channels', 'colors', {
      type: Sequelize.STRING,
      allowNull: true
    })
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('channels', 'colors')
  }
}

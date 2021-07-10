'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'users', 'profile_color', {
      type: Sequelize.STRING,
      allowNull: true
    }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('users', 'profile_color')
  }
}

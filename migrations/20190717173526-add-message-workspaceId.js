'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('messages', 'workspace_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    })
  },

  down: queryInterface => {
    return queryInterface.removeColumn('messages', 'workspace_id')
  }
}

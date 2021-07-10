'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('workspaces', 'workspace_type', {
      type: Sequelize.ENUM('PUBLIC', 'PERSONAL')
    })
  },

  down: queryInterface => {
    return queryInterface.removeColumn('workspaces', 'workspace_type')
  }
}

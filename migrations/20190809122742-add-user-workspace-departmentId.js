'use strict'
const tableName = 'user-workspace-relationships'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'department_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
    ]
  },

  down: async queryInterface => {
    return [await queryInterface.removeColumn(tableName, 'department_id')]
  }
}

'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('messages', 'is_pinned', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }),
      await queryInterface.addColumn('messages', 'pinned_by', {
        type: Sequelize.INTEGER,
        allowNull: true
      }),
      await queryInterface.addColumn('messages', 'pinned_at', {
        type: Sequelize.Sequelize.DATE,
        allowNull: true
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'is_pinned'),
      await queryInterface.removeColumn('messages', 'pinned_by'),
      await queryInterface.removeColumn('messages', 'pinned_at')
    ]
  }
}

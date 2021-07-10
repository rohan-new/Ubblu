'use strict'
const tableName = 'channels'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'description', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      await queryInterface.addColumn(tableName, 'visibility', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }),
      await queryInterface.addColumn(tableName, 'auto_join', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }),
      await queryInterface.addColumn(tableName, 'invite_link', {
        type: Sequelize.STRING,
        allowNull: false
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn(tableName, 'name'),
      await queryInterface.removeColumn(tableName, 'department_id'),
      await queryInterface.removeColumn(tableName, 'timezone'),
      await queryInterface.removeColumn(tableName, 'note'),
      await queryInterface.removeColumn(tableName, 'profile_image')
    ]
  }
}

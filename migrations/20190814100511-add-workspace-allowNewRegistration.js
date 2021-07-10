'use strict'
const tableName = 'workspaces'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'allow_new_registration', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }),
      await queryInterface.addColumn(tableName, 'show_signup_button', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }),
      await queryInterface.addColumn(tableName, 'must_have_email', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      await queryInterface.addColumn(tableName, 'default_user_type', {
        type: Sequelize.ENUM('SUPERADMIN', 'ADMIN', 'MEMBER', 'EMPLOYEE'),
        allowNull: false,
        defaultValue: 'MEMBER'
      })
    ]
  },

  down: async queryInterface => {
    return [
      queryInterface.removeColumn(tableName, 'allow_new_registration'),
      queryInterface.removeColumn(tableName, 'show_signup_button'),
      queryInterface.removeColumn(tableName, 'must_have_email'),
      queryInterface.removeColumn(tableName, 'default_user_type')
    ]
  }
}

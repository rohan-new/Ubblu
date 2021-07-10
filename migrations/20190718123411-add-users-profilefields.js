'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('users', 'name', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      await queryInterface.addColumn('users', 'department_id', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      await queryInterface.addColumn('users', 'timezone', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      await queryInterface.addColumn('users', 'note', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      await queryInterface.addColumn('users', 'profile_image', {
        type: Sequelize.STRING,
        allowNull: true
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('users', 'name'),
      await queryInterface.removeColumn('users', 'department_id'),
      await queryInterface.removeColumn('users', 'timezone'),
      await queryInterface.removeColumn('users', 'note'),
      await queryInterface.removeColumn('users', 'profile_image')
    ]
  }
}

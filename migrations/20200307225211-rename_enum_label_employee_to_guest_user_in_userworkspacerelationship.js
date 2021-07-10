'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.sequelize.query("ALTER TYPE \"enum_user-workspace-relationships_status\" RENAME VALUE 'MEMBER' TO 'GUEST USER';")
    ]  
  },

  down: async queryInterface => {
    return [
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_user-workspace-relationships_status\";')
    ]
  }
}

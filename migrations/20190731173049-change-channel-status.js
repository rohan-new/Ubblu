'use strict'
const tableName = 'user-channel-relationships'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.changeColumn(tableName, 'status', {
        type: Sequelize.TEXT
      }),
      await queryInterface.sequelize.query(
        'drop type "enum_user-channel-relationships_status";'
      ),
      await queryInterface.changeColumn(tableName, 'status', {
        type: Sequelize.ENUM('ADMIN', 'MEMBER', 'BLOCKED')
      })
    ]
  },

  down: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.changeColumn(tableName, 'status', {
        type: Sequelize.TEXT
      }),
      await queryInterface.sequelize.query(
        'drop type "enum_user-channel-relationships_status";'
      ),
      await queryInterface.changeColumn(tableName, 'status', {
        type: Sequelize.ENUM('MEMBER', 'BLOCKED', 'NONE')
      })
    ]
  }
}

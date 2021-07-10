'use strict'
const tableName = 'user-workspace-relationships'

module.exports = {

  up: async (queryInterface, Sequelize) => { 
    return [
      // await queryInterface.removeColumn(tableName, 'notification_frequency'),
      await queryInterface.dropTable(tableName),
      await queryInterface.sequelize.query('DROP TYPE \"enum_user-workspace-relationships_notification_frequency\"'),
      // await queryInterface.removeColumn(tableName, 'email_notifications'),
      await queryInterface.sequelize.query('DROP TYPE \"enum_user-workspace-relationships_email_notifications\"'),
    ]
  }

}

'use strict'
const tableName = 'user-workspace-relationships'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn(tableName, 'notification_frequency', {
        type: Sequelize.ENUM(
          'INSTANTLY',
          '15-MINUTES',
          '30-MINUTES',
          '1-HOUR',
          '24-HOUR'
        ),
        defaultValue: 'INSTANTLY'
      }),
      await queryInterface.addColumn(tableName, 'email_notifications', {
        type: Sequelize.ENUM('15-MINUTES', '1-HOUR', 'NEVER'),
        defaultValue: '15-MINUTES'
      }),
      await queryInterface.addColumn(tableName, 'ubblu_tips', {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      }),
      await queryInterface.addColumn(tableName, 'ubblu_news_announcement', {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn(tableName, 'notification_frequency'),
      await queryInterface.removeColumn(tableName, 'email_notifications'),
      await queryInterface.removeColumn(tableName, 'ubblu_tips'),
      await queryInterface.removeColumn(tableName, 'ubblu_news_announcement')
    ]
  }
}

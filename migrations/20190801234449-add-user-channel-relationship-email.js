'use strict'
const tableName = 'user-channel-relationships'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return await queryInterface.addColumn(
      tableName,
      'is_receive_mail_notification',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    )
  },

  down: async queryInterface => {
    return await queryInterface.removeColumn(
      tableName,
      'is_receive_mail_notification'
    )
  }
}

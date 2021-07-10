'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_user-workspace-relationships_notification_frequency\" AS ENUM('0', '15', '30', '60', '1440')"
      ),

      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_user-workspace-relationships_email_notifications\" AS ENUM('15', '60', '0')"
      ),

      await queryInterface.createTable('user-workspace-relationships', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        workspace_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM(
            'SUPERADMIN',
            'ADMIN',
            'BLOCKED',
            'MEMBER',
            'EMPLOYEE',
            'NONE'
          ),
          defaultValue: 'NONE'
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        is_suspended: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        ubblu_tips: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        ubblu_news_announcement: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notification_frequency: {
          type: Sequelize.ENUM('0', '15', '30', '60', '1440'),
          defaultValue: '0'
        },
        email_notifications: {
          type: Sequelize.ENUM('15', '60', '0'),
          defaultValue: '15'
        }
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.dropTable('user-workspace-relationships'),
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_user-workspace-relationships_notification_frequency";'
      ),
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_user-workspace-relationships_email_notifications";'
      )
    ]
  }
}

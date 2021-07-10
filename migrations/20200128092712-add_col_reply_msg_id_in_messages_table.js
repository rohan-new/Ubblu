'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('messages', 'quoted_msg_id', {
        type: Sequelize.INTEGER
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'quoted_msg_id')
    ]
  }
}

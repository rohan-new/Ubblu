'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return [
      await queryInterface.addColumn('messages', 'tagged_id', {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true
      })
    ]
  },

  down: async queryInterface => {
    return [
      await queryInterface.removeColumn('messages', 'tagged_id')
    ]
  }
}

'use strict'

module.exports = (sequelize, DataTypes) => {
  const ChannelMeta = sequelize.define(
    'ChannelMeta',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      channel_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      metaKey: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      metaValue: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'channel-meta'
    }
  )

  ChannelMeta.associate = function({ Channel, ChannelMeta }) {
    Channel.hasMany(ChannelMeta)
    ChannelMeta.belongsTo(Channel)
  }

  return ChannelMeta
}

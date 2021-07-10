require('dotenv').config()

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    define: {
      timestamps: false,
      freezeTableName: true,
      underscored: true
    },
    logging: false
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    define: {
      timestamps: false,
      freezeTableName: true,
      underscored: true
    },
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    define: {
      timestamps: false,
      freezeTableName: true,
      underscored: true
    },
    logging: false
  }
}

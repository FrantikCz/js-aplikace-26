const { Sequelize } = require('sequelize');
const config = require('./config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

const db = {
  sequelize,
  Sequelize
};

// Import models
db.Post = require('../models/Post')(sequelize, Sequelize);

// Create tables
const initDb = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    await sequelize.sync({ alter: true });
    console.log('✓ Database synchronized');
  } catch (error) {
    console.error('✗ Database error:', error);
  }
};

module.exports = { db, initDb };

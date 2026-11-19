const { Sequelize } = require('sequelize');
const { DataTypes } = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const config = require('./config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);
const sessionStore = new SequelizeStore({ db: sequelize, tableName: 'sessions' });

const db = {
  sequelize,
  Sequelize
};

// Import models
db.Post = require('../models/Post')(sequelize, Sequelize);
db.Comment = require('../models/Comment')(sequelize, Sequelize);
db.User = require('../models/User')(sequelize, Sequelize);

db.User.hasMany(db.Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Post.belongsTo(db.User, { foreignKey: 'userId' });
db.User.hasMany(db.Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Comment.belongsTo(db.User, { foreignKey: 'userId' });

// Define associations
db.Post.hasMany(db.Comment, {
  foreignKey: 'postId',
  onDelete: 'CASCADE'
});
db.Comment.belongsTo(db.Post, {
  foreignKey: 'postId'
});

// Create tables
const initDb = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');
    await sequelize.sync();

    const queryInterface = sequelize.getQueryInterface();
    for (const tableName of ['posts', 'comments']) {
      const columns = await queryInterface.describeTable(tableName);
      if (!columns.userId) {
        await queryInterface.addColumn(tableName, 'userId', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE'
        });
      }
    }

    await sessionStore.sync();
    console.log('✓ Database synchronized');
  } catch (error) {
    console.error('✗ Database error:', error);
    throw error;
  }
};

module.exports = { db, initDb, sessionStore };

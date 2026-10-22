
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const app = require('./app');
const { initDb } = require('../db/sequelize');

const PORT = process.env.PORT || 8000;
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server běží na adrese: http://localhost:${PORT}`);
    });
});

const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const { initDb, sessionStore } = require('./db/sequelize');
const { loadCurrentUser } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');

const sessionSecret = process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'production' ? null : 'local-development-session-secret');

if (!sessionSecret) {
    throw new Error('SESSION_SECRET must be set in production.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(loadCurrentUser);

app.get('/', (req, res) => {
    res.render('index', { title: 'Hlavní stránka' });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'O nás / About' });
});

app.use('/', authRoutes);

// POST routes
app.use('/posts', postRoutes);

// COMMENT routes
app.use('/', commentRoutes);

app.use((req, res) => {
    res.status(404).send('Stránka nebyla nalezena.');
});

if (require.main === module) {
    (async () => {
        await initDb();
        const PORT = process.env.PORT || 8000;
        app.listen(PORT, () => {
            console.log(`Server úspěšně běží přes Nodemon na adrese: http://localhost:${PORT}`);
        });
    })();
}

module.exports = app;

const express = require('express');
const app = express();
app.set('view engine', 'ejs');
app.set('views', './app/views');
app.use(express.static('./public'));
app.use(require('./routes/defaultRouter'));
module.exports = app;

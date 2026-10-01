
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8800;

// Nastavení statické složky pro váš web
app.use(express.static(path.join(__dirname, 'public')));

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Server běží na adrese: http://localhost:${PORT}`);
});

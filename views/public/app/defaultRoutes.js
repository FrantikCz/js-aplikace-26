const router = require('express').Router();
router.get(['/', '/index'], (req, res) => {
	res.render('index');
});

router.get('/about', (req, res) => {
	res.render('about', { title: 'O nás / About' });
});

router.use((req, res) => {
	res.status(404).send('Stránka nebyla nalezena.');
});

module.exports = router;

const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authController = require('../controllers/authController');

// Rota inicial
router.get('/', homeController.index);

router.get('/welcome', async (req, res) => {
    // Verifica se o usuário está autenticado
    if (req.session.user) {
        try {
            const [videos] = await db.query('SELECT id, title, description, youtube_url, created_at, level FROM videos');
            res.render('welcome', { username: req.session.user.username, videos }); // Passa o username e videos para a view
        } catch (error) {
            console.error("Erro ao buscar vídeos:", error);
            res.status(500).send("Erro ao carregar vídeos.");
        }
    } else {
        res.redirect('/login'); // Redireciona para login se não estiver autenticado
    }
});

// Rotas de autenticação
router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', authController.login);
router.get('/register', (req, res) => res.render('register', { error: null, username: '', email: '' }));
router.post('/register', authController.register);

router.get('/contact', async (req, res) => {
    try {
        const [videos] = await db.query('SELECT id, title, description, youtube_url, created_at, level FROM vídeos');
        res.render('videos', { videos });
    } catch (error) {
        console.error("Erro ao buscar vídeos:", error);
        res.status(500).send("Erro ao carregar vídeos.");
    }
});

module.exports = router;
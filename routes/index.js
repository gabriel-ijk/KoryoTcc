const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authController = require('../controllers/authController');

// Rota inicial
router.get('/', homeController.index);

router.get('/welcome', (req, res) => {
    // Verifica se o usuário está autenticado
    if (req.session.user) {
        res.render('welcome', { username: req.session.user.username }); // Passa o username para a view
    } else {
        res.redirect('/login'); // Redireciona para login se não estiver autenticado
    }
});

// Rotas de autenticação
router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', authController.login);
router.get('/register', (req, res) => res.render('register', { error: null, username: '', email: '' }));
router.post('/register', authController.register);

router.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contato' });
});
router.get('/about', (req, res) => {
    res.render('about', { title: 'Sobre' });
});

router.get('/welcome', (req, res) => {
    // Verifica se o usuário está autenticado
    if (req.session.user) {
        res.render('welcome', { username: req.session.user.username }); // Passa o username para a view
    } else {
        res.redirect('/login'); // Redireciona para login se não estiver autenticado
    }
});

module.exports = router;

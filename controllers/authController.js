const bcrypt = require('bcrypt');
const User = require('../models/userModel'); // Importa o modelo User
const saltRounds = 10;

const authController = {
    register: async (req, res) => {
        const { username, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('register', {
                error: 'As senhas não coincidem.',
                username,
                email
            });
        }

        try {
            const existingUser = await User.findByEmailOrUsername(username) || await User.findByEmailOrUsername(email);

            if (existingUser) {
                return res.render('register', {
                    error: 'Nome de usuário ou email já em uso.',
                    username,
                    email
                });
            }

            const hash = await bcrypt.hash(password, saltRounds);
            await User.create(username, email, hash);
            res.redirect('/login');
        } catch (error) {
            console.error('Erro ao registrar o usuário:', error);
            res.render('register', {
                error: 'Erro ao registrar o usuário.',
                username,
                email
            });
        }
    },

    login: async (req, res) => {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername) {
            return res.render('login', { error: 'Por favor, insira um email ou nome de usuário.' });
        }

        try {
            const user = await User.findByEmailOrUsername(emailOrUsername);

            if (!user) {
                return res.render('login', { error: 'Email/Usuário ou senha incorretos.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.render('login', { error: 'Email/Usuário ou senha incorretos.' });
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: user.is_admin
            };

            res.redirect(user.is_admin ? '/admin' : '/');
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.render('login', { error: 'Erro ao fazer login.' });
        }
    },

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};

module.exports = authController;

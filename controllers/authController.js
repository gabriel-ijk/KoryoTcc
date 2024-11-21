const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const saltRounds = 10;

const validLevels = ['branca', 'amarela', 'verde', 'azul', 'vermelha'];

module.exports = {
    register: async (req, res) => {
        try {
            const { username, email, password, confirmPassword, name, surname, level } = req.body;

            if (!username || !email || !password || !confirmPassword || !name || !surname || !level) {
                return res.render('register', {
                    error: 'Por favor, preencha todos os campos.',
                    username,
                    email,
                    name,
                    surname,
                    level
                });
            }

            if (password !== confirmPassword) {
                return res.render('register', {
                    error: 'As senhas não coincidem.',
                    username,
                    email,
                    name,
                    surname,
                    level
                });
            }

            const [existingUsers] = await User.findByUsernameOrEmail(username, email);

            if (existingUsers.length > 0) {
                return res.render('register', {
                    error: 'Usuário ou email já estão em uso.',
                    username,
                    email,
                    name,
                    surname,
                    level
                });
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds);

            await User.insertUser(username, email, hashedPassword, name, surname, level);

            // Criar sessão para o usuário
            req.session.user = {
                id: existingUsers.insertId, // Supondo que insertId seja retornado
                username,
                email,
                level
            };

            res.redirect('/welcome');
        } catch (error) {
            console.error('Erro durante o registro:', error);
            res.render('register', {
                error: 'Erro ao processar o registro. Por favor, tente novamente.',
                username,
                email,
                name,
                surname,
                level
            });
        }
    },

    login: async (req, res) => {
        try {
            const { emailOrUsername, password } = req.body;

            const [userResults] = await User.findByEmailOrUsername(emailOrUsername);
            if (userResults.length === 0) {
                return res.render('login', {
                    error: 'Usuário ou senha inválidos.',
                });
            }

            const user = userResults[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.render('login', {
                    error: 'Usuário ou senha inválidos.',
                });
            }

            // Configurar a sessão
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                level: user.level
            };

            res.redirect('/welcome');
        } catch (error) {
            console.error('Erro durante o login:', error);
            res.render('login', {
                error: 'Erro ao processar o login. Por favor, tente novamente.',
            });
        }
    }
};

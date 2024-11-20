const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const saltRounds = 10;

const validLevels = ['branca', 'amarela', 'verde', 'azul', 'vermelha'];

module.exports = {
    register: async (req, res) => {
        try {
            const { username, email, password, confirmPassword, name, surname, level } = req.body;

            // Verificar se todos os campos estão preenchidos
            if (!username || !email || !password || !confirmPassword || !name || !surname || !level) {
                return res.render('register', {
                    error: 'Por favor, preencha todos os campos.',
                    username: username || '',
                    email: email || '',
                    name: name || '',
                    surname: surname || '',
                    level: level || ''
                });
            }

            // Verificar se as senhas coincidem
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

            // Verificar se o nível é válido
            if (!validLevels.includes(level)) {
                return res.render('register', {
                    error: 'Graduação inválida.',
                    username,
                    email,
                    name,
                    surname,
                    level
                });
            }

            // Verificar se o usuário ou email já existem
            const [results] = await User.findByUsernameOrEmail(username, email);
            const userExists = results.some(user => user.username === username || user.email === email);

            if (userExists) {
                let error = '';
                if (results.some(user => user.username === username)) {
                    error += 'Nome de usuário já está em uso. ';
                }
                if (results.some(user => user.email === email)) {
                    error += 'Email já está em uso.';
                }
                return res.render('register', {
                    error,
                    username,
                    email,
                    name,
                    surname,
                    level
                });
            }

            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Inserir o usuário no banco de dados
            await User.insertUser(username, email, hashedPassword, name, surname, level);

            // Criar sessão para o usuário e redirecionar
            req.session.user = { username, email, level }; // Sessão configurada corretamente
            res.redirect('/welcome');
        } catch (err) {
            console.error('Erro durante o registro:', err);
            res.render('register', {
                error: 'Erro ao processar o registro. Tente novamente.',
                username: req.body.username || '',
                email: req.body.email || '',
                name: req.body.name || '',
                surname: req.body.surname || '',
                level: req.body.level || ''
            });
        }
    },

    login: async (req, res) => {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            return res.render('login', { error: 'Por favor, insira todos os campos.' });
        }

        try {
            const [results] = await User.findByEmailOrUsername(emailOrUsername);
            if (results.length === 0) {
                return res.render('login', { error: 'Usuário ou senha incorretos.' });
            }

            const user = results[0];

            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                req.session.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    level: user.level,
                    is_admin: user.is_admin
                };
                return res.redirect(user.is_admin ? '/add-content' : '/welcome');
            } else {
                return res.render('login', { error: 'Usuário ou senha incorretos.' });
            }
        } catch (err) {
            console.error('Erro ao buscar usuário:', err);
            res.render('login', { error: 'Erro ao buscar usuário.' });
        }
    }
};

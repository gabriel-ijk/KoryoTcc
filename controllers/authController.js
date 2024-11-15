const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const saltRounds = 10;

const validLevels = ['branca', 'amarela', 'verde', 'azul', 'vermelha'];

module.exports = {
    register: (req, res) => {
        const { username, email, password, confirmPassword, name, surname, level } = req.body;

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

        // Verifica se o nível é válido
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

        User.findByUsernameOrEmail(username, email)
            .then(([results]) => {
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

                bcrypt.hash(password, saltRounds, (err, hash) => {
                    if (err) {
                        console.error('Erro ao hash da senha:', err);
                        return res.render('register', {
                            error: 'Erro ao registrar o usuário.',
                            username,
                            email,
                            name,
                            surname,
                            level
                        });
                    }

                    User.insertUser(username, email, hash, name, surname, level)
                        .then(() => {
                            req.session.username = username;
                            res.redirect('/welcome');
                        })
                        .catch(err => {
                            console.error('Erro ao registrar o usuário:', err);
                            res.render('register', {
                                error: 'Erro ao registrar o usuário.',
                                username,
                                email,
                                name,
                                surname,
                                level
                            });
                        });
                });
            })
            .catch(err => {
                console.error('Erro ao verificar a existência do usuário:', err);
                res.render('register', {
                    error: 'Erro ao verificar dados do usuário.',
                    username,
                    email,
                    name,
                    surname,
                    level
                });
            });
    },
    
    // Exemplo de login no authController.js
login: (req, res) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername) {
        return res.render('login', { error: 'Por favor, insira um email ou nome de usuário.' });
    }

    User.findByEmailOrUsername(emailOrUsername)
        .then(([results]) => {
            if (results.length === 0) {
                return res.render('login', { error: 'Email/Usuário ou senha incorretos.' });
            }

            const user = results[0];

            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('Erro ao comparar a senha:', err);
                    return res.render('login', { error: 'Erro ao comparar a senha.' });
                }

                if (isMatch) {
                    // Armazena todas as informações necessárias na sessão
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        is_admin: user.is_admin,
                        level: user.level // Adiciona o nível do usuário
                    };

                    // Redireciona conforme o tipo de usuário
                    if (user.is_admin) {
                        res.redirect('/admin');
                    } else {
                        res.redirect('/welcome');
                    }
                } else {
                    res.render('login', { error: 'Email/Usuário ou senha incorretos.' });
                }
            });
        })
        .catch(err => {
            console.error('Erro ao buscar o usuário:', err);
            res.render('login', { error: 'Erro ao buscar o usuário.' });
        });
}
  
};
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const saltRounds = 10;

module.exports = {
    register: (req, res) => {
        const { username, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('register', {
                error: 'As senhas não coincidem.',
                username,
                email
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
                        email
                    });
                }

                bcrypt.hash(password, saltRounds, (err, hash) => {
                    if (err) {
                        console.error('Erro ao hash da senha:', err);
                        return res.render('register', {
                            error: 'Erro ao registrar o usuário.',
                            username,
                            email
                        });
                    }

                    User.insertUser(username, email, hash)
                        .then(() => {
                            // Após o registro, armazena o nome do usuário na sessão
                            req.session.username = username; // Salva o nome do usuário na sessão
                            res.redirect('/welcome'); // Redireciona para a página de boas-vindas
                        })
                        .catch(err => {
                            console.error('Erro ao registrar o usuário:', err);
                            res.render('register', {
                                error: 'Erro ao registrar o usuário.',
                                username,
                                email
                            });
                        });
                });
            })
            .catch(err => {
                console.error('Erro ao verificar a existência do usuário:', err);
                res.render('register', {
                    error: 'Erro ao verificar dados do usuário.',
                    username,
                    email
                });
            });
    },
    
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
                        // Armazena as informações do usuário na sessão
                        req.session.user = {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            is_admin: user.is_admin
                        };

                        // Após o login, redireciona conforme o tipo de usuário
                        if (user.is_admin) {
                            res.redirect('/admin');
                        } else {
                            res.redirect('/welcome'); // Redireciona para a página de boas-vindas após login
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
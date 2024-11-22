const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const saltRounds = 10;

const validLevels = ['branca', 'amarela', 'verde', 'azul', 'vermelha'];

module.exports = {
    register: async (req, res) => {
        try {
            const { username, email, password, confirmPassword, name, surname, level } = req.body;
    
            // Lista de graduações válidas (case-sensitive)
            const validLevels = ['Branca', 'Amarela', 'Verde', 'Azul', 'Vermelha'];
    
            // Log para depuração
            console.log('Graduação recebida:', level);
            console.log('Graduações válidas:', validLevels);
    
            // Verificar campos obrigatórios
            if (!username || !email || !password || !confirmPassword || !name || !surname || !level) {
                return res.render('register', {
                    error: 'Por favor, preencha todos os campos.',
                    username, email, name, surname, level
                });
            }
    
            // Verificar se a graduação é válida
            if (!validLevels.includes(level.trim())) {
                return res.render('register', {
                    error: 'Graduação inválida.',
                    username, email, name, surname, level
                });
            }
    
            // Verificar se as senhas coincidem
            if (password !== confirmPassword) {
                return res.render('register', {
                    error: 'As senhas não coincidem.',
                    username, email, name, surname, level
                });
            }
    
            // Verificar se usuário ou email já existem
            const [existingUsers] = await User.findByUsernameOrEmail(username, email);
            if (existingUsers.length > 0) {
                return res.render('register', {
                    error: 'Nome de usuário ou email já estão em uso.',
                    username, email, name, surname, level
                });
            }
    
            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, saltRounds);
    
            // Inserir o usuário no banco de dados
            const [result] = await User.insertUser(username, email, hashedPassword, name, surname, level);
    
            // Criar sessão para o usuário
            req.session.user = {
                id: result.insertId,
                username,
                level
            };
    
            // Garantir que a sessão foi salva antes do redirecionamento
            req.session.save((err) => {
                if (err) {
                    console.error('Erro ao salvar sessão:', err);
                    return res.status(500).send('Erro ao processar o registro.');
                }
                res.redirect('/welcome'); // Redireciona para a página de boas-vindas
            });
        } catch (err) {
            console.error('Erro durante o registro:', err);
            res.render('register', {
                error: 'Erro ao processar o registro. Tente novamente.',
                username, email, name, surname, level
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

const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const multer = require('multer');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

const saltRounds = 10; // Número de rounds de sal para hashing de senhas

// Configuração do EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para análise de dados de formulário
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração do middleware de sessão
app.use(session({
    secret: 'your_secret_key', // Altere para um segredo mais seguro em produção
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Configure para `true` em produção com HTTPS
}));

// Configuração do banco de dados
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tcc_koryo'
});
const db = pool.promise(); // Converte as operações do pool para usar promises

// Configuração do Multer para upload de arquivos
const storage = multer.memoryStorage(); // Armazena os arquivos na memória (RAM)
const upload = multer({ storage: storage });

// Rotas

// Rota para renderizar a página de contato
app.get('/contact', (req, res) => {
    res.render('contact', { success: null, error: null });
});

// Rota para processar o envio do formulário de contato
app.post('/contact', (req, res) => {
    // Simulação de sucesso no envio do e-mail
    res.render('contact', { success: "Sua mensagem foi enviada com sucesso!", error: null });
});

// Rota para a página de uploads sem autenticação
app.get('/admin/uploads', (req, res) => {
    db.query('SELECT * FROM uploads') // Ajuste a consulta conforme necessário
        .then(([rows]) => {
            res.render('uploads', { files: rows });
        })
        .catch(err => {
            console.error('Erro ao buscar uploads:', err);
            res.status(500).send('Erro ao buscar uploads.');
        });
});

// Rota para a página de administração sem autenticação
app.get('/admin', (req, res) => {
    res.render('admin');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.get('/register', (req, res) => {
    res.render('register', { error: null, username: '', email: '', surname: '' });
});

app.get('/', (req, res) => {
    res.render('home', { title: 'Bem-vindo à página principal' });
});

app.post('/register', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('register', {
            error: 'As senhas não coincidem.',
            username,
            email
        });
    }

    db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email])
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

                db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash])
                    .then(() => res.redirect('/login'))
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
});

app.post('/login', (req, res) => {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername) {
        return res.render('login', { error: 'Por favor, insira um email ou nome de usuário.' });
    }

    const sql = emailOrUsername.includes('@')
        ? 'SELECT * FROM users WHERE email = ?'
        : 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [emailOrUsername])
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
                    // Configurar a sessão com as informações do usuário
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        is_admin: user.is_admin
                    };

                    // Redirecionar com base na função do usuário
                    if (user.is_admin) {
                        res.redirect('/admin'); // Redireciona o admin para a página de administração
                    } else {
                        res.redirect('/'); // Redireciona os usuários normais para a página inicial
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
});

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        // Simulação de sucesso no upload
        const successMessage = 'Arquivo enviado com sucesso!';
        
        // Retorna uma resposta JSON
        res.status(200).json({ success: successMessage });
    } catch (error) {
        console.error('Erro ao enviar o arquivo:', error);
        res.status(500).json({ error: 'Erro ao processar o upload.' });
    }
});




// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

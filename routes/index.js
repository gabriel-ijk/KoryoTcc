const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const authController = require('../controllers/authController');
const db = require('../models/db'); // Importa o módulo de conexão com o banco de dados

// Rota inicial
router.get('/', homeController.index);

router.get('/welcome', async (req, res) => {
    // Verifica se o usuário está autenticado
    if (req.session.user) {
        try {
            // Obtenha o nível de graduação do usuário
            const userLevel = req.session.user.level;

            // Consulta para buscar os vídeos
            const [videos] = await db.query('SELECT id, title, description, youtube_url, created_at, level FROM videos');
            
            // Renderiza a página welcome e passa o username, vídeos e nível do usuário para a view
            res.render('welcome', { username: req.session.user.username, videos, userLevel });
        } catch (error) {
            console.error("Erro ao buscar vídeos:", error);
            res.status(500).send("Erro ao carregar vídeos.");
        }
    } else {
        res.redirect('/login'); // Redireciona para login se não estiver autenticado
    }
});

// Rota para exibir a página de perfil do usuário
router.get('/account', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redireciona para login se o usuário não estiver autenticado
    }

    try {
        // Obtém informações do usuário do banco de dados
        const [user] = await db.query('SELECT username, email, name, surname, level FROM users WHERE id = ?', [req.session.user.id]);
        const successMessage = req.query.success ? 'Alterações salvas com sucesso!' : null; // Exibe mensagem se houver
        res.render('account', { user: user[0], error: null, successMessage });
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        res.status(500).send('Erro ao carregar a página do perfil');
    }
});

// Rota para atualizar as informações do perfil do usuário
router.post('/account', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redireciona para login se o usuário não estiver autenticado
    }

    const { username, email, name, surname, level } = req.body;

    try {
        // Verifica se o nome de usuário já existe no banco de dados e pertence a outro usuário
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.session.user.id]);
        if (existingUser.length > 0) {
            // Nome de usuário já está em uso por outro usuário
            const [user] = await db.query('SELECT username, email, name, surname, level FROM users WHERE id = ?', [req.session.user.id]);
            return res.render('account', { user: user[0], error: 'Nome de usuário já está em uso. Escolha outro.', successMessage: null });
        }

        // Atualiza as informações do usuário no banco de dados
        await db.query(
            'UPDATE users SET username = ?, email = ?, name = ?, surname = ?, level = ? WHERE id = ?', 
            [username, email, name, surname, level, req.session.user.id]
        );

        // Redireciona para a página de perfil com uma mensagem de sucesso
        res.redirect('/account?success=true');
    } catch (error) {
        console.error('Erro ao atualizar informações do usuário:', error);
        res.status(500).send('Erro ao atualizar o perfil');
    }
});

router.get('/video/:videoId', async (req, res) => {
    const videoId = req.params.videoId;

    try {
        // Obtém o vídeo com base no `videoId` da URL
        const [videoResult] = await db.query('SELECT * FROM videos WHERE youtube_url LIKE ?', [`%${videoId}%`]);
        const video = videoResult[0];

        if (!video) {
            return res.status(404).send('Vídeo não encontrado');
        }

        // Obtém vídeos relacionados (excluindo o vídeo atual)
        const [relatedVideos] = await db.query('SELECT * FROM videos WHERE youtube_url NOT LIKE ? LIMIT 5', [`%${videoId}%`]);

        // Obtém os comentários para o vídeo atual
        const [comments] = await db.query('SELECT * FROM comments WHERE video_id = ?', [video.id]);

        res.render('videoPlayer', { video, relatedVideos, comments });
    } catch (error) {
        console.error('Erro ao carregar o vídeo:', error);
        res.status(500).send('Erro ao carregar o vídeo');
    }
});


// Rota para adicionar um comentário
router.post('/video/:videoId/comment', async (req, res) => {
    const videoId = req.params.videoId;
    const { content } = req.body;
    const username = req.session.user ? req.session.user.username : "Anônimo"; // Usar o nome do usuário se estiver logado, caso contrário, "Anônimo"

    try {
        // Primeiro, obter o id do vídeo no banco de dados baseado no YouTube ID
        const [videoResult] = await db.query('SELECT id FROM videos WHERE youtube_url LIKE ?', [`%${videoId}%`]);
        if (videoResult.length === 0) {
            return res.status(404).send('Vídeo não encontrado');
        }
        
        const dbVideoId = videoResult[0].id;

        // Inserir o comentário na tabela comments usando o id do vídeo no banco de dados (dbVideoId)
        await db.query('INSERT INTO comments (video_id, username, content, date) VALUES (?, ?, ?, NOW())', [dbVideoId, username, content]);

        // Redirecionar de volta para a página do vídeo após o comentário ser enviado
        res.redirect(`/video/${videoId}`);
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).send('Erro ao adicionar comentário');
    }
});


// Rota para favoritar um vídeo
router.post('/favorite/:id', async (req, res) => {
    const videoId = req.params.id;
    const userId = req.session.user.id; // Assume que o ID do usuário está na sessão

    try {
        await db.query('INSERT INTO favorites (user_id, video_id) VALUES (?, ?)', [userId, videoId]);
        res.redirect(`/video/${videoId}`);
    } catch (error) {
        console.error('Erro ao favoritar vídeo:', error);
        res.status(500).send('Erro ao favoritar vídeo');
    }
});



// Rotas de autenticação
router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', authController.login);
router.get('/register', (req, res) => res.render('register', { error: null, username: '', email: '' }));
router.post('/register', authController.register);

router.get('/contact', (req, res) => res.render('contact', { error: null }));

module.exports = router;

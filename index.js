const express = require('express');
const router = express.Router();
const homeController = require('./controllers/homeController');
const authController = require('./controllers/authController');
const db = require('./models/db');

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Middleware para verificar se é admin
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.is_admin) {
        return next();
    }
    res.status(403).send('Acesso negado: você não tem permissão para acessar esta página.');
}

router.get('/register', (req, res) => {
    res.render('register', {
        error: null,
        username: '',
        email: '',
        name: '',
        surname: '',
        level: ''
    });
});
router.post('/register', authController.register);

router.post('/add-content', isAdmin, async (req, res) => {
    const { title, description, youtube_url, level } = req.body;

    if (!title || !description || !youtube_url || !level) {
        return res.status(400).send('Por favor, preencha todos os campos.');
    }

    try {
        await db.query(
            'INSERT INTO videos (title, description, youtube_url, level) VALUES (?, ?, ?, ?)',
            [title, description, youtube_url, level]
        );

        // Redireciona com parâmetro de sucesso
        res.redirect('/add-content?success=true');
    } catch (error) {
        console.error('Erro ao adicionar conteúdo:', error);
        res.status(500).send('Erro ao adicionar conteúdo.');
    }
});



// Página de adicionar conteúdo (admin)
router.get('/add-content', isAdmin, async (req, res) => {
    try {
        const successMessage = req.query.success ? 'Conteúdo adicionado com sucesso!' : null; // Captura o sucesso, se existir
        res.render('add-content', { successMessage }); // Passa para a view
    } catch (error) {
        console.error('Erro ao carregar a página de administração:', error);
        res.status(500).send('Erro ao carregar a página de administração.');
    }
});


// Página inicial
router.get('/', homeController.index);

// Página de boas-vindas
router.get('/welcome', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id; // Obter o ID do usuário logado

    try {
        // Buscar os vídeos da graduação do usuário
        const [videos] = await db.query('SELECT * FROM videos WHERE level = ?', [req.session.user.level]);

        // Buscar os favoritos do usuário
        const [favorites] = await db.query(
            'SELECT videos.* FROM videos INNER JOIN favorites ON videos.id = favorites.video_id WHERE favorites.user_id = ?',
            [userId]
        );

        // Calcular o progresso (opcional, se for utilizado no template)
        const progressPercentage = videos.length > 0
            ? Math.round((await db.query(
                `SELECT COUNT(*) AS watchedCount FROM watched_videos WHERE user_id = ? AND video_id IN (SELECT id FROM videos WHERE level = ?)`,
                [userId, req.session.user.level]
            ))[0][0].watchedCount / videos.length * 100)
            : 0;

        // Renderizar o template e passar os dados
        res.render('welcome', {
            username: req.session.user.username,
            progressPercentage,
            videos,
            favorites // Enviando os favoritos para o template
        });
    } catch (error) {
        console.error('Erro ao carregar a página de boas-vindas:', error);
        res.status(500).send('Erro ao carregar os dados.');
    }
});

// Página de vídeo
router.get('/video/:id', isAuthenticated, async (req, res) => {
    const videoId = req.params.id; // Obtém o ID do vídeo da URL
    const user = req.session.user; // Obtém o usuário da sessão

    try {
        // Verifica se o ID do vídeo está definido
        if (!videoId) {
            console.error('Erro: ID do vídeo não definido.');
            return res.status(400).send('ID do vídeo é necessário.');
        }

        // Verifica se o usuário está logado
        if (!user || !user.id || !user.username) {
            console.error('Erro: Usuário não está logado.');
            return res.status(401).send('Você precisa estar logado para acessar esta página.');
        }

        const userId = user.id; // ID do usuário logado
        const username = user.username; // Nome de usuário logado

        // Busca o vídeo
        const [videoResults] = await db.query(
            'SELECT * FROM videos WHERE youtube_url LIKE ? OR id = ?',
            [`%${videoId}%`, videoId]
        );

        if (videoResults.length === 0) {
            return res.status(404).send('Vídeo não encontrado.');
        }

        const video = videoResults[0];

        // Carrega os favoritos do usuário
        const [favorites] = await db.query(
            'SELECT video_id FROM favorites WHERE user_id = ?',
            [userId]
        );

        // Busca vídeos sugeridos
        const [suggestedVideos] = await db.query(
            'SELECT * FROM videos WHERE id != ? AND level = ? ORDER BY RAND() LIMIT 10',
            [video.id, video.level]
        );

        // Busca comentários relacionados ao vídeo
        const [comments] = await db.query(
            'SELECT * FROM comments WHERE video_id = ? ORDER BY date DESC',
            [video.id]
        );

        // Renderiza o template com as informações necessárias
        res.render('videoPlayer', {
            video,
            favorites,
            suggestedVideos,
            comments,
            username // Passa o username para o template
        });
    } catch (error) {
        console.error('Erro ao carregar o vídeo:', error);
        res.status(500).send('Erro ao carregar o vídeo.');
    }
});



// Adicionar comentário
router.post('/video/:videoId/comment', isAuthenticated, async (req, res) => {
    const videoId = req.params.videoId;
    const { content } = req.body;
    const username = req.session.user.username;

    try {
        const [videoResult] = await db.query('SELECT id FROM videos WHERE youtube_url LIKE ?', [`%${videoId}%`]);
        if (videoResult.length === 0) {
            return res.status(404).send('Vídeo não encontrado.');
        }

        const dbVideoId = videoResult[0].id;
        await db.query('INSERT INTO comments (video_id, username, content, date) VALUES (?, ?, ?, NOW())', [dbVideoId, username, content]);

        res.redirect(`/video/${videoId}`);
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        res.status(500).send('Erro ao adicionar comentário.');
    }
});

// Favoritar vídeo
router.post('/favorite/:id', isAuthenticated, async (req, res) => {
    const videoId = req.params.id;
    const userId = req.session.user.id; // Assumindo que o ID do usuário está na sessão

    try {
        // Verifica se o vídeo já está favoritado
        const [existingFavorite] = await db.query(
            'SELECT * FROM favorites WHERE user_id = ? AND video_id = ?',
            [userId, videoId]
        );

        if (existingFavorite.length > 0) {
            return res.redirect(`/video/${videoId}`); // Já está favoritado, redireciona sem duplicar
        }

        // Insere o favorito no banco de dados
        await db.query(
            'INSERT INTO favorites (user_id, video_id) VALUES (?, ?)',
            [userId, videoId]
        );

        res.redirect(`/video/${videoId}`); // Redireciona de volta para a página do vídeo
    } catch (error) {
        console.error('Erro ao favoritar vídeo:', error);
        res.status(500).send('Erro ao favoritar o vídeo.');
    }
});


// Página de perfil
router.get('/account', isAuthenticated, async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        const [userResults] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = userResults[0];

        const [watchedVideosResults] = await db.query(`
            SELECT videos.title, videos.description, watched_videos.watched_at 
            FROM watched_videos
            JOIN videos ON watched_videos.video_id = videos.id
            WHERE watched_videos.user_id = ?
            ORDER BY watched_videos.watched_at DESC
        `, [userId]);

        res.render('account', {
            user,
            watchedVideos: watchedVideosResults
        });
    } catch (error) {
        console.error('Erro ao carregar a página de perfil:', error);
        res.status(500).send('Erro ao carregar a página de perfil.');
    }
});


// Atualizar perfil
router.post('/account', isAuthenticated, async (req, res) => {
    const { username, email, name, surname, level } = req.body;

    try {
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.session.user.id]);
        if (existingUser.length > 0) {
            const [user] = await db.query('SELECT username, email, name, surname, level FROM users WHERE id = ?', [req.session.user.id]);
            return res.render('account', { user: user[0], error: 'Nome de usuário já está em uso.', successMessage: null });
        }

        await db.query('UPDATE users SET username = ?, email = ?, name = ?, surname = ?, level = ? WHERE id = ?', [username, email, name, surname, level, req.session.user.id]);
        res.redirect('/account?success=true');
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).send('Erro ao atualizar perfil.');
    }
});

// Rotas de autenticação
router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', authController.login);

router.get('/contact', (req, res) => res.render('contact'));

router.get('/about', (req, res) => res.render('about'));

module.exports = router;

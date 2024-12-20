const express = require('express');
const router = express.Router();
const homeController = require('./controllers/homeController');
const authController = require('./controllers/authController');
const db = require('./models/db');

const levelsOrder = ['branca', 'amarela', 'verde', 'azul', 'vermelha'];

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.id) {
        return next(); // Sessão válida, continua para a rota
    }
    console.error('Erro: Sessão de usuário inválida.');
    return res.redirect('/login'); // Redireciona para login
};


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

router.get('/welcome', isAuthenticated, async (req, res) => {
    try {
        // Verifica se o usuário está logado e possui uma sessão válida
        const user = req.session.user;
        if (!user || !user.id || !user.level) {
            console.error('Erro: Sessão de usuário inválida.');
            return res.redirect('/login'); // Redireciona para login
        }

        const userId = user.id; // Obter o ID do usuário logado
        const userLevel = user.level;

        const userLevelOrder = ['Branca', 'Amarela', 'Verde', 'Azul', 'Vermelha']; // Ordem das graduações

        // Obter graduações inferiores
        const userLevelIndex = userLevelOrder.indexOf(userLevel);
        if (userLevelIndex === -1) {
            console.error('Erro: Graduação inválida.');
            return res.status(400).send('Erro: Graduação inválida.');
        }
        const lowerGradeLevels = userLevelOrder.slice(0, userLevelIndex); // Graduações anteriores

        // Buscar vídeos da graduação do usuário
        const [videos] = await db.query('SELECT * FROM videos WHERE level = ?', [userLevel]);

        // Buscar vídeos assistidos
        const [watchedVideos] = await db.query(
            'SELECT video_id FROM watched_videos WHERE user_id = ?',
            [userId]
        );
        const watchedVideoIds = watchedVideos.map(v => v.video_id);

        // Adicionar propriedade `watched` aos vídeos do progresso
        const videosWithWatchedStatus = videos.map(video => ({
            ...video,
            watched: watchedVideoIds.includes(video.id) || false // Sempre define `watched`
        }));

        let lowerGradeVideos = [];
        // Só executa a query se houver graduações inferiores
        if (lowerGradeLevels.length > 0) {
            const placeholders = lowerGradeLevels.map(() => '?').join(','); // Gera `?, ?, ?` para graduações
            const [lowerGradeResults] = await db.query(
                `SELECT * FROM videos WHERE level IN (${placeholders}) ORDER BY FIELD(level, ${placeholders}) ASC, id ASC`,
                [...lowerGradeLevels, ...lowerGradeLevels] // Passa graduações duas vezes: para IN e FIELD
            );
            lowerGradeVideos = lowerGradeResults;
        }

        // Buscar os favoritos do usuário
        const [favorites] = await db.query(
            'SELECT videos.* FROM videos INNER JOIN favorites ON videos.id = favorites.video_id WHERE favorites.user_id = ?',
            [userId]
        );

        // Calcular o progresso
        const [watchedCountResult] = await db.query(
            `SELECT COUNT(*) AS watchedCount FROM watched_videos WHERE user_id = ? AND video_id IN (SELECT id FROM videos WHERE level = ?)`,
            [userId, userLevel]
        );
        const watchedCount = watchedCountResult[0].watchedCount || 0;
        const progressPercentage = videos.length > 0
            ? Math.round((watchedCount / videos.length) * 100)
            : 0;

        // Renderizar o template e passar os dados
        res.render('welcome', {
            username: user.username,
            progressPercentage,
            videos: videosWithWatchedStatus, // Envia vídeos com a propriedade `watched`
            favorites,
            lowerGradeVideos, // Adicione esta nova lista
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
router.post('/favorite/:id', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.session.user.id;

        if (!userId) {
            return res.status(401).send('Usuário não autenticado.');
        }

        // Inserir nos favoritos
        const query = `INSERT INTO favorites (user_id, video_id) VALUES (?, ?)`;
        await db.query(query, [userId, videoId]);

        res.redirect('/welcome');
    } catch (error) {
        console.error('Erro ao favoritar o vídeo:', error);
        res.status(500).send('Erro ao favoritar o vídeo.');
    }
});

router.post('/unfavorite/:id', async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.session.user.id;

        if (!userId) {
            return res.status(401).send('Usuário não autenticado.');
        }

        const query = `DELETE FROM favorites WHERE user_id = ? AND video_id = ?`;
        await db.query(query, [userId, videoId]);

        res.redirect('/welcome');
    } catch (error) {
        console.error('Erro ao desfavoritar o vídeo:', error);
        res.status(500).send('Erro ao desfavoritar o vídeo.');
    }
});
router.post('/mark-watched/:id', async (req, res) => {
    try {
        const userId = req.session.user.id;
        const videoId = req.params.id;

        if (!userId || !videoId) {
            return res.status(400).send('Usuário ou vídeo inválido.');
        }

        const query = `
            INSERT INTO watched_videos (user_id, video_id) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE user_id = user_id
        `;
        await db.query(query, [userId, videoId]);

        res.redirect('/welcome'); // Redireciona para atualizar a página
    } catch (error) {
        console.error('Erro ao marcar como assistido:', error);
        res.status(500).send('Erro ao marcar o vídeo como assistido.');
    }
});


// Página de perfil
router.get('/account', isAuthenticated, async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;

    if (!userId) {
        return res.redirect('/login');
    }

    try {
        const userLevelOrder = ['branca', 'amarela', 'verde', 'azul', 'vermelha']; // Ordem das graduações

        const [userResults] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        const user = userResults[0];

        // Calcular progresso do usuário
        const [videos] = await db.query('SELECT * FROM videos WHERE level = ?', [user.level]);
        const [watchedCountResult] = await db.query(
            'SELECT COUNT(*) AS watchedCount FROM watched_videos WHERE user_id = ? AND video_id IN (SELECT id FROM videos WHERE level = ?)',
            [userId, user.level]
        );

        const watchedCount = watchedCountResult[0].watchedCount || 0;
        const progressPercentage = videos.length > 0
            ? Math.round((watchedCount / videos.length) * 100)
            : 0;

        const [watchedVideosResults] = await db.query(`
            SELECT videos.title, videos.description, watched_videos.watched_at 
            FROM watched_videos
            JOIN videos ON watched_videos.video_id = videos.id
            WHERE watched_videos.user_id = ?
            ORDER BY watched_videos.watched_at DESC
        `, [userId]);

        res.render('account', {
            user,
            watchedVideos: watchedVideosResults,
            progressPercentage,
            userLevelOrder // Adicionar ao template
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
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao encerrar a sessão:', err);
            return res.status(500).send('Erro ao encerrar a sessão.');
        }
        res.redirect('/login');
    });
});

// Rotas de autenticação
router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', authController.login);

router.get('/contact', (req, res) => res.render('contact'));

router.get('/about', (req, res) => res.render('about'));

module.exports = router;

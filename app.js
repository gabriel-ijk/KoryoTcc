const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const routes = require('./index');
const videoController = require('./controllers/videoController');
const db = require('./models/db');



// Configuração do EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para análise de dados de formulário
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração do middleware de sessão
app.use(session({
    secret: 'your_secret_key', 
    resave: false,
    saveUninitialized: true
}));


// Rota para exibir a página de vídeos
app.get('/videos', videoController.getVideos);

// Configuração das rotas
app.use('/', routes);

app.post('/mark-watched/:id', async (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;
    const videoId = req.params.id;

    if (!userId || !videoId) {
        console.error('Erro: userId ou videoId indefinido.');
        return res.status(400).send('Usuário ou vídeo inválido.');
    }

    try {
        // Insere um registro ou ignora se já existir
        await db.query(
            'INSERT INTO watched_videos (user_id, video_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = user_id',
            [userId, videoId]
        );
        res.redirect('/welcome'); // Redireciona para atualizar a barra de progresso
    } catch (error) {
        console.error('Erro ao marcar como assistido:', error);
        res.status(500).send('Erro no servidor.');
    }
});


// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});



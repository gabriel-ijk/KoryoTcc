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
    secret: 'seu_segredo_aqui', // Altere para algo seguro
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Coloque como true se usar HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 dia
    }
}));

// Rota para exibir a página de vídeos
app.get('/videos', videoController.getVideos);

// Configuração das rotas
app.use('/', routes);

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});


const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const routes = require('./routes/index');
const videoController = require('./controllers/videoController');

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

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});



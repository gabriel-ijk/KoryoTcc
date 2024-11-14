const db = require('../models/db');

// Função para obter vídeos com filtro opcional de cor
exports.getVideos = async (req, res) => {
    try {
        const { color } = req.query; // Recebe o filtro de cor (level)
        let query = 'SELECT title, youtube_url, level FROM videos';
        const values = [];

        // Adiciona condição ao SQL se o filtro de cor estiver presente
        if (color) {
            query += ' WHERE level = ?';
            values.push(color);
        }

        const [rows] = await db.query(query, values);
        const videos = rows || []; // Garantir que `videos` seja sempre um array

        res.render('videos', { videos, selectedColor: color });
    } catch (error) {
        console.error('Erro ao buscar vídeos:', error);
        res.status(500).send('Erro no servidor');
    }
};
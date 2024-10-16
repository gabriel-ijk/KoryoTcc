const mysql = require('mysql2');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tcc_koryo'
});

const db = pool.promise(); // Converte para promises

const User = {
    findByEmailOrUsername: async (emailOrUsername) => {
        const query = emailOrUsername.includes('@') 
            ? 'SELECT * FROM users WHERE email = ?' 
            : 'SELECT * FROM users WHERE username = ?';
        const [results] = await db.query(query, [emailOrUsername]);
        return results[0]; // Retorna o primeiro usuário encontrado
    },

    create: async (username, email, passwordHash) => {
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        await db.query(query, [username, email, passwordHash]);
    },

    findByEmail: async (email) => {
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        return results.length ? results[0] : null;
    },

    findByUsername: async (username) => {
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        return results.length ? results[0] : null;
    },

    findAllUploads: async () => {
        const [rows] = await db.query('SELECT * FROM uploads');
        return rows;
    }
};

module.exports = User;

const db = require('./db');

const User = {
    findByUsernameOrEmail: (username, email) => {
        return db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    },
    insertUser: (username, email, hash) => {
        return db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash]);
    },
    findByEmailOrUsername: (emailOrUsername) => {
        const sql = emailOrUsername.includes('@')
            ? 'SELECT * FROM users WHERE email = ?'
            : 'SELECT * FROM users WHERE username = ?';
        return db.query(sql, [emailOrUsername]);
    }
};

module.exports = User;

const db = require('./db');

const User = {
    findByUsernameOrEmail: (username, email) => {
        return db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    },
    insertUser: (username, email, hash, name, surname, level) => {
    return db.query('INSERT INTO users (username, email, password, name, surname, level) VALUES (?, ?, ?, ?, ?, ?)', 
        [username, email, hash, name, surname, level]);
},
    findByEmailOrUsername: (emailOrUsername) => {
        const sql = emailOrUsername.includes('@')
            ? 'SELECT * FROM users WHERE email = ?'
            : 'SELECT * FROM users WHERE username = ?';
        return db.query(sql, [emailOrUsername]);
    }
};

module.exports = User;

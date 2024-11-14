const db = require('./db');

const User = {
    findByUsernameOrEmail: (username, email) => {
        const query = 'SELECT * FROM users WHERE username = ? OR email = ?';
        return db.query(query, [username, email]);
    },

    findByEmailOrUsername: (emailOrUsername) => {
        const query = 'SELECT * FROM users WHERE email = ? OR username = ?';
        return db.query(query, [emailOrUsername, emailOrUsername]);
    },
    
    insertUser: (username, email, password, name, surname, level) => {
        const query = `
            INSERT INTO users (username, email, password, name, surname, level) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        return db.query(query, [username, email, password, name, surname, level]);
    }
};

module.exports = User;

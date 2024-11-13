const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'mysql.infocimol.com.br',
    user: 'infocimol05',
    password: 'Koryotcc8448',
    database: 'infocimol05'
});

// const pool = mysql.createPool({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'tcc_koryo'
// });

module.exports = pool.promise();

const mysql = require('mysql2/promise'); 
require('dotenv').config();

//pool pra facilitar a gerenciar multiplas conexoes 
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'mysqluser',
    database: process.env.DB_DATABASE || 'Teste',
    waitForConnections: true,
    connectionLimit: 10, //número máximo de conexões no pool
    queueLimit: 0
});

module.exports = pool;

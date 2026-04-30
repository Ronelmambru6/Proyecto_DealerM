const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function probarConexion() {
    try {
        const connection = await pool.getConnection();
        console.log('Conectado exitosamente a la base de datos MySQL');
        connection.release();
    } catch (error) {
        console.error('Error conectando a la base de datos:', error);
    }
}

probarConexion();
module.exports = pool;
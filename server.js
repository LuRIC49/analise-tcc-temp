require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mainPool = require('./db');
const authRoutes = require('./routes/authRoutes');
const filialRoutes = require('./routes/filialRoutes');
const vistoriaRoutes = require('./routes/vistoriaRoutes');
const insumoRoutes = require('./routes/insumoRoutes');
const historicoRoutes = require('./routes/historicoRoutes');

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', authRoutes);
app.use('/api/historico', historicoRoutes);
app.use('/api/filiais', filialRoutes);
app.use('/api/vistorias', vistoriaRoutes);
app.use('/api/insumos', insumoRoutes);


async function initializeDatabase() {
    let connection;
    try {
        connection = await mainPool.getConnection();
        console.log('✔ Conexão com o banco de dados estabelecida para criação de tabelas.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS empresa (
                cnpj CHAR(14) PRIMARY KEY,
                nome VARCHAR(200) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL
            )
        `);
        console.log('✔ Tabela `empresa` verificada/criada.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS filial (
                cnpj CHAR(14) PRIMARY KEY,
                empresa_cnpj CHAR(14) NOT NULL,
                nome VARCHAR(200) NOT NULL,
                endereco VARCHAR(200) NOT NULL,
                email_responsavel VARCHAR(200) NOT NULL,
                FOREIGN KEY (empresa_cnpj) REFERENCES empresa(cnpj) ON DELETE CASCADE
            )
        `);
        console.log('✔ Tabela `filial` verificada/criada.');
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS insumo (
                codigo INT AUTO_INCREMENT PRIMARY KEY,
                descricao VARCHAR(200) NOT NULL,
                imagem VARCHAR(255) NULL
            )
        `);
        console.log('✔ Tabela `insumo` verificada/criada.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS vistoria (
                codigo INT AUTO_INCREMENT PRIMARY KEY,
                filial_cnpj CHAR(14) NOT NULL,
                data_inicio DATE,
                data_fim DATE,
                tecnico_responsavel VARCHAR(200),
                FOREIGN KEY (filial_cnpj) REFERENCES filial(cnpj) ON DELETE CASCADE
            )
        `);
        console.log('✔ Tabela `vistoria` verificada/criada.');


        //Coloquei                 FOREIGN KEY (vistoria_codigo) REFERENCES vistoria(codigo) ON DELETE CASCADE , para caso excluir uma vistoria também excluir todos os insumos cadastrados nesta vistoria.
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS  insumo_filial_vistoria_imutavel(
                codigo INT AUTO_INCREMENT PRIMARY KEY,
                insumo_codigo INT NOT NULL,
                filial_cnpj CHAR(14) NOT NULL,
                vistoria_codigo INT NULL,
                numero_serial VARCHAR(100) NULL DEFAULT NULL,
                validade DATE,
                local VARCHAR(200),
                descricao VARCHAR(200) NULL,
                FOREIGN KEY (insumo_codigo) REFERENCES insumo(codigo),
                FOREIGN KEY (filial_cnpj) REFERENCES filial(cnpj) ON DELETE CASCADE,
                FOREIGN KEY (vistoria_codigo) REFERENCES vistoria(codigo) ON DELETE CASCADE 
            )
        `);
        console.log('✔ Tabela `insumo_filial` verificada/criada.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS insumo_filial_mutavel (
                codigo INT AUTO_INCREMENT PRIMARY KEY,
                insumo_codigo INT NOT NULL,
                filial_cnpj CHAR(14) NOT NULL,
                numero_serial VARCHAR(100) NULL DEFAULT NULL,
                validade DATE,
                local VARCHAR(200),
                descricao VARCHAR(200) NULL,
                FOREIGN KEY (insumo_codigo) REFERENCES insumo(codigo),
                FOREIGN KEY (filial_cnpj) REFERENCES filial(cnpj) ON DELETE CASCADE
            )
        `);
        console.log('✔ Tabela `insumo_filial_mutavel` verificada/criada.');


    } catch (error) {
        console.error('❌ Erro ao inicializar o banco de dados:', error);
        process.exit(1);
    } finally {
        if (connection) connection.release(); 
    }
}

app.use((err, req, res, next) => {
    console.error("Ocorreu um erro na aplicação:", err.stack);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Erro no upload: ${err.message}` });
    } 
    if (err) {
        return res.status(400).json({ message: err.message || 'Ocorreu um erro na sua requisição.' });
    }
    next(err);
});

initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Servidor backend rodando em http://localhost:${port}`);
    });
}).catch(err => {
    console.error('❌ Falha crítica ao iniciar o servidor:', err);
    process.exit(1);
});
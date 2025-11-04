const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mainPool = require('../db');

exports.registrarEmpresa = async (req, res) => {
    const { nome, cnpj, senha, email, endereco } = req.body;
    if (!nome || !cnpj || !senha || !email || !endereco) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    let connection;
    try {
        const passwordHash = await bcrypt.hash(senha, 6);
        connection = await mainPool.getConnection();
        
        await connection.beginTransaction();

        await connection.execute(
            'INSERT INTO empresa (cnpj, nome, password_hash, email) VALUES (?, ?, ?, ?)',
            [cnpj, nome, passwordHash, email]
        );

        await connection.execute(
            'INSERT INTO filial (cnpj, empresa_cnpj, nome, endereco, email_responsavel) VALUES (?, ?, ?, ?, ?)',
            [cnpj, cnpj, nome, endereco, email]
        );

        await connection.commit();

        res.status(201).json({ message: 'Empresa e filial matriz cadastradas com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'CNPJ ou E-mail já cadastrado.' });
        }
        console.error('Erro ao registrar empresa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.release();
    }
};

exports.loginUsuario = async (req, res) => {
    const { cpfCnpj, senha } = req.body; 
    if (!cpfCnpj || !senha) return res.status(400).json({ message: 'CNPJ e senha são obrigatórios.' });
    
    try {
        const cleanedCnpj = cpfCnpj.replace(/\D/g, '');
        if (cleanedCnpj.length !== 14) {
            return res.status(401).json({ message: 'CNPJ ou senha inválidos.' });
        }

        const [rows] = await mainPool.execute(
            "SELECT cnpj, password_hash FROM empresa WHERE cnpj = ?", 
            [cleanedCnpj]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'CNPJ ou senha inválidos.' });
        }
        const empresa = rows[0];

        const isMatch = await bcrypt.compare(senha, empresa.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'CNPJ ou senha inválidos.' });
        }
        
        const payload = { cnpj: empresa.cnpj };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({ message: 'Login bem-sucedido!', token: token });

    } catch (error) {
        console.error('Erro no processo de login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarPerfil = async (req, res) => {
    try {
        const { empresaCnpj } = req.user;

        const [rows] = await mainPool.execute(
            'SELECT nome, cnpj, email FROM empresa WHERE cnpj = ?',
            [empresaCnpj] 
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Perfil da empresa não encontrado.' });
        }
        
        const profileData = {
            name: rows[0].nome,
            cpf_cnpj: rows[0].cnpj,
            email: rows[0].email,
        };
        res.json(profileData);

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


exports.alterarEmail = async (req, res) => {
    const { empresaCnpj } = req.user;
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Formato de e-mail inválido.' });
    }

    try {
        const query = `UPDATE empresa SET email = ? WHERE cnpj = ?`;
        await mainPool.execute(query, [email, empresaCnpj]);
        res.status(200).json({ message: 'E-mail atualizado com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Este e-mail já está em uso por outra conta.' });
        }
        console.error('Erro ao atualizar e-mail:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.alterarSenha = async (req, res) => {
    const { empresaCnpj } = req.user;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha || novaSenha.length < 8) {
        return res.status(400).json({ message: 'Senha atual e nova senha (mínimo 8 caracteres) são obrigatórias.' });
    }

    try {
        const [rows] = await mainPool.execute(`SELECT password_hash FROM empresa WHERE cnpj = ?`, [empresaCnpj]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }
        const HASH_ATUAL = rows[0].password_hash;

        const isMatch = await bcrypt.compare(senhaAtual, HASH_ATUAL);
        if (!isMatch) {
            return res.status(403).json({ message: 'A senha atual está incorreta.' });
        }

        const novoHash = await bcrypt.hash(novaSenha, 10);
        await mainPool.execute(
            `UPDATE empresa SET password_hash = ? WHERE cnpj = ?`, 
            [novoHash, empresaCnpj]
        );

        res.status(200).json({ message: 'Senha alterada com sucesso! Por segurança, por favor, faça o login novamente.' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
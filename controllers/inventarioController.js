const mainPool = require('../db');


exports.listarFiliais = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        
        const [filiais] = await mainPool.query(
            'SELECT * FROM filial WHERE empresa_cnpj = ? ORDER BY nome ASC', 
            [empresa_cnpj]
        );
        res.json(filiais);
    } catch (error) {
        console.error('Erro ao listar filiais:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.criarFilial = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { nome, cnpj, endereco, email_responsavel } = req.body;

        if (!nome || !cnpj || !endereco || !email_responsavel) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para criar a filial.' });
        }

        await mainPool.execute(
            'INSERT INTO filial (cnpj, empresa_cnpj, nome, endereco, email_responsavel) VALUES (?, ?, ?, ?, ?)',
            [cnpj, empresa_cnpj, nome, endereco, email_responsavel]
        );

        res.status(201).json({ message: 'Filial cadastrada com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'O CNPJ desta filial já está cadastrado.' });
        }
        console.error('Erro ao criar filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


exports.listarInventario = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { cnpj: filial_cnpj } = req.params;

        const query = `
            SELECT inf.codigo, inf.validade, inf.local, i.descricao, i.imagem
            FROM insumo_filial AS inf
            JOIN filial AS f ON inf.filial_cnpj = f.cnpj
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.filial_cnpj = ? AND f.empresa_cnpj = ?
            ORDER BY i.descricao ASC;
        `;

        const [inventario] = await mainPool.query(query, [filial_cnpj, empresa_cnpj]);
        res.json(inventario);
    } catch (error) {
        console.error('Erro ao listar inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.adicionarItemInventario = async (req, res) => {
    let connection;
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { cnpj: filial_cnpj } = req.params;
        const { descricao, validade, local } = req.body;

        connection = await mainPool.getConnection();
        await connection.beginTransaction();

        const [filialRows] = await connection.query('SELECT * FROM filial WHERE cnpj = ? AND empresa_cnpj = ?', [filial_cnpj, empresa_cnpj]);
        if (filialRows.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: 'Acesso negado. Esta filial não pertence à sua empresa.' });
        }

        let [insumoRows] = await connection.query('SELECT codigo FROM insumo WHERE descricao = ?', [descricao]);
        let insumo_codigo;

        if (insumoRows.length > 0) {
            insumo_codigo = insumoRows[0].codigo;
        } else {
            const [result] = await connection.execute('INSERT INTO insumo (descricao) VALUES (?)', [descricao]);
            insumo_codigo = result.insertId;
        }

        await connection.execute(
            'INSERT INTO insumo_filial (insumo_codigo, filial_cnpj, validade, local) VALUES (?, ?, ?, ?)',
            [insumo_codigo, filial_cnpj, validade || null, local || null]
        );

        await connection.commit(); // Confirma a transação
        res.status(201).json({ message: 'Item adicionado ao inventário com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback(); // Desfaz a transação em caso de erro
        console.error('Erro ao adicionar item ao inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.release();
    }
};

exports.excluirItemInventario = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { id: item_codigo } = req.params;

        const query = `
            DELETE inf FROM insumo_filial AS inf
            JOIN filial AS f ON inf.filial_cnpj = f.cnpj
            WHERE inf.codigo = ? AND f.empresa_cnpj = ?;
        `;

        const [result] = await mainPool.execute(query, [item_codigo, empresa_cnpj]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item não encontrado ou você não tem permissão para excluí-lo.' });
        }

        res.status(200).json({ message: 'Item removido do inventário com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir item do inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};










exports.buscarDetalhesFilial = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { cnpj: filial_cnpj } = req.params;

        const [filiais] = await mainPool.query(
            'SELECT * FROM filial WHERE cnpj = ? AND empresa_cnpj = ?',
            [filial_cnpj, empresa_cnpj]
        );

        if (filiais.length === 0) {
            return res.status(404).json({ message: 'Filial não encontrada ou não pertence à sua empresa.' });
        }
        res.json(filiais[0]);
    } catch (error) {
        console.error('Erro ao buscar detalhes da filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.listarVistorias = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { cnpj: filial_cnpj } = req.params;

        const query = `
            SELECT v.* FROM vistoria AS v
            JOIN filial AS f ON v.filial_cnpj = f.cnpj
            WHERE v.filial_cnpj = ? AND f.empresa_cnpj = ?
            ORDER BY v.data_inicio DESC;
        `;

        const [vistorias] = await mainPool.query(query, [filial_cnpj, empresa_cnpj]);
        res.json(vistorias);
        
    } catch (error) {
        console.error('Erro ao listar vistorias:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.iniciarNovaVistoria = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const { cnpj: filial_cnpj } = req.params;
        const { tecnico_responsavel } = req.body;

        if (!tecnico_responsavel) {
            return res.status(400).json({ message: 'O nome do técnico responsável é obrigatório.' });
        }

        const [filialRows] = await mainPool.query('SELECT * FROM filial WHERE cnpj = ? AND empresa_cnpj = ?', [filial_cnpj, empresa_cnpj]);
        if (filialRows.length === 0) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const [result] = await mainPool.execute(
            'INSERT INTO vistoria (filial_cnpj, data_inicio, tecnico_responsavel) VALUES (?, CURDATE(), ?)',
            [filial_cnpj, tecnico_responsavel]
        );

        const novaVistoriaId = result.insertId;
        res.status(201).json({ message: 'Nova vistoria iniciada com sucesso!', vistoriaId: novaVistoriaId });

    } catch (error) {
        console.error('Erro ao iniciar nova vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};









exports.buscarDetalhesVistoria = async (req, res) => {
    try {
        const { id: vistoria_codigo } = req.params;

        const [vistoriaRows] = await mainPool.query('SELECT * FROM vistoria WHERE codigo = ?', [vistoria_codigo]);
        if (vistoriaRows.length === 0) {
            return res.status(404).json({ message: 'Vistoria não encontrada.' });
        }

        const queryInsumos = `
            SELECT i.descricao, inf.local, inf.validade
            FROM insumo_filial AS inf
            JOIN insumo AS i ON inf.insumo_codigo = i.codigo
            WHERE inf.vistoria_codigo = ?;
        `;
        const [insumos] = await mainPool.query(queryInsumos, [vistoria_codigo]);

        res.json({ detalhes: vistoriaRows[0], insumos });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.adicionarInsumoAVistoria = async (req, res) => {
    let connection;
    try {
        const { id: vistoria_codigo } = req.params;
        const { descricao, validade, local, filial_cnpj, descricao_item } = req.body;
        if (!descricao || !filial_cnpj || !local) {
            return res.status(400).json({ message: 'Campos obrigatórios (Tipo de Insumo, Filial e Local) estão faltando.' });
        }

        connection = await mainPool.getConnection();
        await connection.beginTransaction();

        let [insumoRows] = await connection.query('SELECT codigo FROM insumo WHERE descricao = ?', [descricao]);
        let insumo_codigo;

        if (insumoRows.length > 0) {
            insumo_codigo = insumoRows[0].codigo;
        } else {
            const [result] = await connection.execute('INSERT INTO insumo (descricao) VALUES (?)', [descricao]);
            insumo_codigo = result.insertId;
        }
        await connection.execute(
            'INSERT INTO insumo_filial (insumo_codigo, filial_cnpj, vistoria_codigo, validade, local, descricao) VALUES (?, ?, ?, ?, ?, ?)',
            [insumo_codigo, filial_cnpj, vistoria_codigo, validade || null, local, descricao_item || null]
        );

        await connection.commit();
        res.status(201).json({ message: 'Insumo adicionado à vistoria com sucesso!' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao adicionar insumo à vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        if (connection) connection.release();
    }
};

exports.finalizarVistoria = async (req, res) => {
    try {
        const { id: vistoria_codigo } = req.params;
        await mainPool.execute(
            'UPDATE vistoria SET data_fim = CURDATE() WHERE codigo = ?',
            [vistoria_codigo]
        );
        res.status(200).json({ message: 'Vistoria finalizada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};



exports.listarTiposDeInsumos = async (req, res) => {
    try {
        const [insumos] = await mainPool.query('SELECT codigo, descricao, imagem FROM insumo ORDER BY descricao ASC');
        res.json(insumos);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
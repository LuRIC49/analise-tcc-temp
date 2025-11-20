const Vistoria = require('../models/vistoriaModel');
const { InsumoFilial } = require('../models/insumoModel');
const db = require('../db');

function isNotEmpty(value) {
     return value !== null && value !== undefined && String(value).trim() !== ''; 
}




exports.listarVistorias = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const vistorias = await Vistoria.findByFilial(filialCnpj);
        res.json(vistorias);
    } catch (error) {
        console.error('Erro ao listar vistorias:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.iniciarNovaVistoria = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const { tecnico_responsavel } = req.body;
        if (!isNotEmpty(tecnico_responsavel)) { 
            return res.status(400).json({ message: 'O nome do técnico responsável é obrigatório.' });
        }
        const vistoriaId = await Vistoria.create({ filial_cnpj: filialCnpj, tecnico_responsavel });
        res.status(201).json({ message: 'Nova vistoria iniciada com sucesso!', vistoriaId });
    } catch (error) {
        console.error('Erro ao iniciar nova vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.finalizarVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const vistoria = await Vistoria.findByIdAndEmpresa(id, empresaCnpj);
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão.' });
        }
        if (vistoria.data_fim) {
            return res.status(403).json({ message: 'Ação proibida. Esta vistoria já foi finalizada.' });
        }
        await Vistoria.finalize(id);
        res.status(200).json({ message: 'Vistoria finalizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao finalizar vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.excluirVistoria = async (req, res) => {
    let connection; 
    try {
        const { id: vistoria_codigo } = req.params; 
        const { empresaCnpj } = req.user;

        connection = await db.getConnection(); 
        await connection.beginTransaction(); 

        
        
        const [rowsVistoria] = await connection.query(
            `SELECT v.data_fim FROM vistoria AS v
             JOIN filial AS f ON v.filial_cnpj = f.cnpj
             WHERE v.codigo = ? AND f.empresa_cnpj = ? FOR UPDATE;`,
            [vistoria_codigo, empresaCnpj]
        );

        if (rowsVistoria.length === 0) {
            throw new Error('Vistoria não encontrada ou você não tem permissão para excluí-la.');
        }
        if (rowsVistoria[0].data_fim) {
            throw new Error('Ação proibida. Não é possível excluir uma vistoria finalizada.');
        }

        
        
        const querySelectMutavel = `
            SELECT mut.codigo 
            FROM insumo_filial_mutavel AS mut
            JOIN insumo_filial_vistoria_imutavel AS imu
              ON mut.filial_cnpj = imu.filial_cnpj
              AND mut.insumo_codigo = imu.insumo_codigo
              AND mut.numero_serial <=> imu.numero_serial
            WHERE imu.vistoria_codigo = ?;
        `;
        const [rowsMutavel] = await connection.query(querySelectMutavel, [vistoria_codigo]);

        
        if (rowsMutavel.length > 0) {
            const codigosParaDeletar = rowsMutavel.map(row => row.codigo);
            const queryDeleteMutavel = 'DELETE FROM insumo_filial_mutavel WHERE codigo IN (?)';
            await connection.query(queryDeleteMutavel, [codigosParaDeletar]);
            console.log(`[excluirVistoria] Excluídos ${codigosParaDeletar.length} itens da tabela MUTAVEL.`);
        }

        
        
        const [resultDeleteVistoria] = await connection.execute(
            'DELETE FROM vistoria WHERE codigo = ?', 
            [vistoria_codigo]
        );

        if (resultDeleteVistoria.affectedRows === 0) {
            throw new Error('Falha ao remover a vistoria (affectedRows=0).');
        }

        
        await connection.commit();
        
        res.status(200).json({ message: 'Vistoria e todos os seus insumos associados (no inventário e no histórico) foram excluídos com sucesso!' });

    } catch (error) {
        
        if (connection) await connection.rollback(); 
        console.error('Erro ao excluir vistoria:', error);
        
        let statusCode = 500;
        if (error.message.includes('não encontrada') || error.message.includes('permissão')) {
            statusCode = 404;
        } else if (error.message.includes('finalizada')) {
            statusCode = 403;
        }
        
        res.status(statusCode).json({ message: error.message || 'Erro interno do servidor.' });
    } finally {
        
        if (connection) connection.release(); 
    }
};

exports.adicionarInsumoAVistoria = async (req, res) => {
    try {
        const { id: vistoria_codigo } = req.params;
        const { empresaCnpj } = req.user; 
        const { descricao, validade, local, descricao_item, numero_serial } = req.body;

        
        if (!isNotEmpty(descricao)) return res.status(400).json({ message: 'O tipo do insumo (descrição) é obrigatório.' });
        if (!isNotEmpty(local)) return res.status(400).json({ message: 'A localização é obrigatória.' });
        if (!isValidFutureDate(validade)) { 
            return res.status(400).json({ message: 'Data de validade inválida. Use AAAA-MM-DD, não pode ser vazia ou passada.' });
        }
        if (!isNotEmpty(numero_serial)) { 
            return res.status(400).json({ message: 'O Número de Serial é obrigatório.' });
        }
        

        const vistoria = await Vistoria.findByIdAndEmpresa(vistoria_codigo, empresaCnpj);
        if (!vistoria) return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão.' });
        if (vistoria.data_fim) return res.status(403).json({ message: 'Ação proibida. Vistoria já finalizada.' });

        await InsumoFilial.create({
            filial_cnpj: vistoria.filial_cnpj,
            vistoria_codigo,
            tipo_descricao: descricao,
            validade: validade,
            local: local,
            descricao_item: descricao_item,
            numero_serial: numero_serial
            
        });
        res.status(201).json({ message: 'Insumo adicionado à vistoria com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo à vistoria:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
             res.status(409).json({ message: 'Erro de duplicidade detectado (Serial já existe?).'});
        } else {
            res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
        }
    }
};



exports.buscarDetalhesVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const vistoria = await Vistoria.findByIdAndEmpresa(id, empresaCnpj);
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão para acessá-la.' });
        }
        const insumos = await InsumoFilial.findByVistoria(id);
        res.json({ detalhes: vistoria, insumos });
    } catch (error) {
        console.error('Erro ao buscar detalhes da vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
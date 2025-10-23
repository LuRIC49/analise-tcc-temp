const Filial = require('../models/filialModel');
const Vistoria = require('../models/vistoriaModel');
const { Insumo, InsumoFilial } = require('../models/insumoModel');

const db = require('../db');

exports.listarFiliais = async (req, res) => {
    try {
        const { empresaCnpj } = req.user; 
        const filiais = await Filial.findByEmpresa(empresaCnpj);
        res.json(filiais);
    } catch (error) {
        console.error('Erro ao listar filiais:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.criarFilial = async (req, res) => {
    try {
        const { empresaCnpj } = req.user;
        await Filial.create(req.body, empresaCnpj);
        res.status(201).json({ message: 'Filial cadastrada com sucesso!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'O CNPJ desta filial já está cadastrado.' });
        }
        console.error('Erro ao criar filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarDetalhesFilial = async (req, res) => {
    try {
        const { empresaCnpj } = req.user;
        const { cnpj: filialCnpj } = req.params;
        const filial = await Filial.findById(filialCnpj, empresaCnpj);
        if (!filial) {
            return res.status(404).json({ message: 'Filial não encontrada ou você não tem permissão.' });
        }
        res.json(filial);
    } catch (error) {
        console.error('Erro ao buscar detalhes da filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// --- CONTROLLERS PARA VISTORIAS ---
exports.listarVistorias = async (req, res) => {
    try {
        // A autorização é garantida pelo middleware checkFilialOwnership
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
        if (!tecnico_responsavel) {
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

        // USA O MÉTODO SEGURO: Verifica a propriedade da vistoria antes de qualquer ação
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
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;

        // USA O MÉTODO SEGURO: Garante que o usuário só possa excluir vistorias da sua própria empresa
        const vistoria = await Vistoria.findByIdAndEmpresa(id, empresaCnpj);

        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão para excluí-la.' });
        }
        if (vistoria.data_fim) {
            return res.status(403).json({ message: 'Ação proibida. Não é possível excluir uma vistoria finalizada.' });
        }

        // NOTA: A remoção da vistoria está configurada com ON DELETE CASCADE
        // no server.js, então isso deve excluir os insumos da tabela imutável
        // associados a esta vistoria.
        // Precisamos garantir que o vistoriaModel.js tenha o método .remove(id)
        if (typeof Vistoria.remove !== 'function') {
             // Fallback ou erro se .remove não existir
             const [result] = await require('../db').execute('DELETE FROM vistoria WHERE codigo = ?', [id]);
             if(result.affectedRows === 0) throw new Error('Falha ao remover a vistoria.');
        } else {
             await Vistoria.remove(id);
        }
        
        res.status(200).json({ message: 'Vistoria e seus insumos foram excluídos com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// --- CONTROLLERS PARA INVENTÁRIO/INSUMOS ---

exports.listarTiposDeInsumos = async (req, res) => {
    try {
        const insumos = await Insumo.findAllTypes();
        res.json(insumos);
    } catch (error) {
        console.error('Erro ao listar tipos de insumos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

/**
 * NOVO: Lista os números de seriais distintos de uma filial.
 */
exports.listarSeriaisPorFilial = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        // O middleware checkFilialOwnership já validou a posse desta filial
        const seriais = await InsumoFilial.findSeriaisByFilial(filialCnpj);
        res.json(seriais);
    } catch (error) {
        console.error('Erro ao listar números de serial:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


exports.listarInventario = async (req, res) => {
    try {
        // A autorização já é garantida pelo middleware checkFilialOwnership
        const { cnpj: filialCnpj } = req.params;
        const inventario = await InsumoFilial.findByFilial(filialCnpj);
        res.json(inventario);
    } catch (error) {
        console.error('Erro ao listar inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarDetalhesVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;

        // USA O MÉTODO SEGURO: Garante que o usuário só possa ver detalhes de vistorias da sua empresa
        const vistoria = await Vistoria.findByIdAndEmpresa(id, empresaCnpj);

        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você не tem permissão para acessá-la.' });
        }
        
        const insumos = await InsumoFilial.findByVistoria(id);
        res.json({ detalhes: vistoria, insumos });
    } catch (error) {
        console.error('Erro ao buscar detalhes da vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.adicionarInsumoAVistoria = async (req, res) => {
    try {
        const { id: vistoria_codigo } = req.params;
        const { empresaCnpj } = req.user;
        const { descricao, validade, local, descricao_item, numero_serial } = req.body; // Pega o serial do body

        // [NOVA VALIDAÇÃO] Verifica se é extintor e exige serial
        if (descricao && descricao.toLowerCase().includes('extintor') && (!numero_serial || numero_serial.trim() === '')) {
            return res.status(400).json({ message: 'O Número de Serial é obrigatório para extintores.' });
        }

        const vistoria = await Vistoria.findByIdAndEmpresa(vistoria_codigo, empresaCnpj);

        // ... (restante da lógica de verificação da vistoria) ...
        if (!vistoria) { /* ... */ }
        if (vistoria.data_fim) { /* ... */ }

        await InsumoFilial.create({
            filial_cnpj: vistoria.filial_cnpj, 
            vistoria_codigo,
            tipo_descricao: descricao, // Nome correto vindo do body
            validade: validade,
            local: local,
            descricao_item: descricao_item,
            numero_serial: numero_serial // Passa o serial para o Model
        });

        res.status(201).json({ message: 'Insumo adicionado à vistoria com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo à vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.editarInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;
        const { validade, local, descricao, numero_serial } = req.body;

        // --- VALIDAÇÃO DO SERIAL ---
        // 1. Busca o tipo do insumo (sem lock, apenas para validação)
        //    Garante que o item existe e pertence à empresa.
        const queryBuscaTipo = `
            SELECT i.descricao as tipo_insumo 
            FROM insumo_filial_mutavel inf
            JOIN insumo i ON inf.insumo_codigo = i.codigo
            JOIN filial f ON inf.filial_cnpj = f.cnpj
            WHERE inf.codigo = ? AND f.empresa_cnpj = ?;
        `;
        const [rowsTipo] = await db.query(queryBuscaTipo, [id, empresaCnpj]);

        if (rowsTipo.length === 0) {
             return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }
        const tipoInsumo = rowsTipo[0].tipo_insumo;

        // 2. Aplica a regra de obrigatoriedade do serial
        if (tipoInsumo.toLowerCase().includes('extintor') && (!numero_serial || numero_serial.trim() === '')) {
             return res.status(400).json({ message: 'O Número de Serial é obrigatório para extintores.' });
        }
        // --- FIM DA VALIDAÇÃO ---

        // 3. Chama o método transacional do Model para fazer a atualização e o log
        //    (Este método já contém a lógica de beginTransaction, commit, rollback)
        const affectedRows = await InsumoFilial.updateAndLog(
            id,
            { validade, local, descricao, numero_serial },
            empresaCnpj
        );

        // O método updateAndLog já lança erro se não encontrar (devido ao FOR UPDATE interno),
        // mas mantemos uma verificação extra por segurança.
        if (affectedRows === 0) {
            // Tecnicamente, não deveria chegar aqui se o findById acima funcionou,
            // a menos que algo delete o item entre a leitura e a chamada do updateAndLog.
            throw new Error('Falha ao atualizar o insumo. O item pode ter sido removido.');
        }

        res.json({ message: 'Insumo atualizado com sucesso e histórico de alteração registrado!' });

    } catch (error) {
        console.error('Erro ao editar insumo:', error);
        // Verifica se é o erro de lock timeout especificamente
        if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
             res.status(503).json({ message: 'O sistema está ocupado processando outra requisição. Por favor, tente novamente em alguns instantes.' });
        } else {
             // Outros erros (incluindo o 'Insumo não encontrado' do updateAndLog)
             res.status(500).json({ message: error.message || 'Erro interno do servidor.' });
        }
    }
    // Não precisamos mais do finally { connection.release() } aqui.
};



exports.buscarInsumoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;

        const insumo = await InsumoFilial.findById(id, empresaCnpj);

        if (!insumo) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão para acessá-lo.' });
        }

        res.json(insumo);
    } catch (error) {
        console.error('Erro ao buscar detalhes do insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};




exports.adicionarInsumoDireto = async (req, res) => {
    try {
        const { cnpj: filial_cnpj } = req.params;
        const insumoData = req.body; // Dados do modal { descricao, validade, local, descricao_item, numero_serial }

        // [NOVA VALIDAÇÃO] Verifica se é extintor e exige serial
        if (insumoData.descricao && insumoData.descricao.toLowerCase().includes('extintor') && (!insumoData.numero_serial || insumoData.numero_serial.trim() === '')) {
             return res.status(400).json({ message: 'O Número de Serial é obrigatório para extintores.' });
        }

        // Chama o model para criar o registro (que salva em ambas as tabelas)
        await InsumoFilial.createDirect({ 
            ...insumoData, 
            filial_cnpj, 
            tipo_descricao: insumoData.descricao // O campo 'descricao' do modal é o 'tipo_descricao'
            // numero_serial já está em insumoData via spread operator (...)
        });

        res.status(201).json({ message: 'Insumo adicionado diretamente ao inventário com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo direto:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarHistoricoInsumo = async (req, res) => {
    try {
        const { id } = req.params; // ID da tabela insumo_filial_mutavel
        const { empresaCnpj } = req.user; // Para garantir a propriedade

        // Chama a nova função do model para buscar o histórico
        const historico = await InsumoFilial.findHistoryById(id, empresaCnpj);

        if (!historico) {
             // findHistoryById retornará null se o item principal não for encontrado ou não pertencer à empresa
             return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }

        res.json(historico); // Retorna o array de registros históricos

    } catch (error) {
        console.error('Erro ao buscar histórico do insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar histórico.' });
    }
};


exports.listarLocaisPorFilial = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        // A posse da filial já foi validada pelo middleware checkFilialOwnership

        // Chama a nova função do model
        const locais = await Filial.findLocationsByFilial(filialCnpj); // Colocando no filialModel
        res.json(locais);

    } catch (error) {
        console.error('Erro ao listar locais da filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar locais.' });
    }
};


exports.excluirItemInventario = async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaCnpj } = req.user;

        // 1. Verifica se o insumo existe e pertence à empresa antes de excluir
        const insumoExistente = await InsumoFilial.findById(id, empresaCnpj);
        if (!insumoExistente) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão para excluí-lo.' });
        }

        // 2. Remove APENAS da tabela mutável
        const affectedRows = await InsumoFilial.remove(id);
        if (affectedRows === 0) {
            // Redundante, mas seguro
            return res.status(404).json({ message: 'Falha ao excluir o insumo.' });
        }

        res.json({ message: 'Insumo removido do inventário com sucesso! (Histórico mantido)' });

    } catch (error) {
        console.error('Erro ao excluir insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
const Filial = require('../models/filialModel');
const Vistoria = require('../models/vistoriaModel');
const { Insumo, InsumoFilial } = require('../models/insumoModel');

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
            return res.status(404).json({ message: 'Vistoria não encontrada ou você не tem permissão.' });
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

        await Vistoria.remove(id);
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

        const vistoria = await Vistoria.findByIdAndEmpresa(vistoria_codigo, empresaCnpj);
        
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada ou você não tem permissão.' });
        }
        if (vistoria.data_fim) {
            return res.status(403).json({ message: 'Ação proibida. Vistoria já finalizada.' });
        }

        await InsumoFilial.create({
            filial_cnpj: vistoria.filial_cnpj, // Usa o CNPJ da vistoria encontrada para segurança
            vistoria_codigo,
            tipo_descricao: req.body.descricao,
            validade: req.body.validade,
            local: req.body.local,
            descricao_item: req.body.descricao_item
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
        const { validade, local, descricao } = req.body;

        // 1. Verifica se o insumo existe e pertence à empresa
        const insumoExistente = await InsumoFilial.findById(id, empresaCnpj);
        if (!insumoExistente) {
            return res.status(404).json({ message: 'Insumo não encontrado ou você não tem permissão.' });
        }
        
        // LÓGICA DE HISTÓRICO: Inserir o estado *anterior* na tabela imutável
        // PROBLEMA: Não temos o vistoria_codigo associado a esta alteração aqui.
        // SOLUÇÃO TEMPORÁRIA: Não salvar no histórico imutável nesta tela.
        // A lógica de histórico ficará APENAS na tela de vistoria-detalhe.js
        // console.log("Dados antigos para histórico (se tivéssemos vistoria_codigo):", insumoExistente);

        // 2. Atualiza os dados na tabela mutável
        const affectedRows = await InsumoFilial.update(id, { validade, local, descricao });
        if (affectedRows === 0) {
            // Isso não deve acontecer se a busca acima funcionou, mas é uma segurança
            throw new Error('Falha ao atualizar o insumo.');
        }

        res.json({ message: 'Insumo atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao editar insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
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
        const insumoData = req.body; // Dados do modal

        // Chama o model para criar o registro (que salva em ambas as tabelas)
        await InsumoFilial.createDirect({ 
            ...insumoData, 
            filial_cnpj, 
            tipo_descricao: insumoData.descricao // O campo 'descricao' do modal é o 'tipo_descricao'
        });

        res.status(201).json({ message: 'Insumo adicionado diretamente ao inventário com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar insumo direto:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
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

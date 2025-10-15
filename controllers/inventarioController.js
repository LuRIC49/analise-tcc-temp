// Importa os models que farão o trabalho com o banco de dados
const Filial = require('../models/filialModel');
const Vistoria = require('../models/vistoriaModel');
const { Insumo, InsumoFilial } = require('../models/insumoModel');

// --- CONTROLLERS PARA FILIAIS ---

exports.listarFiliais = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        const filiais = await Filial.findByEmpresa(empresa_cnpj);
        res.json(filiais);
    } catch (error) {
        console.error('Erro ao listar filiais:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.criarFilial = async (req, res) => {
    try {
        const { cnpj: empresa_cnpj } = req.user;
        await Filial.create(req.body, empresa_cnpj);
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
        const { cnpj: empresa_cnpj } = req.user;
        const { cnpj: filial_cnpj } = req.params;
        const filial = await Filial.findById(filial_cnpj, empresa_cnpj);
        if (!filial) {
            return res.status(404).json({ message: 'Filial não encontrada ou não pertence à sua empresa.' });
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
        const { cnpj: filial_cnpj } = req.params;
        // Lógica de segurança: verificar se a filial pertence à empresa logada
        const filial = await Filial.findById(filial_cnpj, req.user.cnpj);
        if (!filial) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }
        const vistorias = await Vistoria.findByFilial(filial_cnpj);
        res.json(vistorias);
    } catch (error) {
        console.error('Erro ao listar vistorias:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.iniciarNovaVistoria = async (req, res) => {
    try {
        const { cnpj: filial_cnpj } = req.params;
        const { tecnico_responsavel } = req.body;

        if (!tecnico_responsavel) {
            return res.status(400).json({ message: 'O nome do técnico responsável é obrigatório.' });
        }

        const filial = await Filial.findById(filial_cnpj, req.user.cnpj);
        if (!filial) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const vistoriaId = await Vistoria.create({ filial_cnpj, tecnico_responsavel });
        res.status(201).json({ message: 'Nova vistoria iniciada com sucesso!', vistoriaId });

    } catch (error) {
        console.error('Erro ao iniciar nova vistoria:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.finalizarVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const vistoria = await Vistoria.findById(id);

        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria не найдена.' });
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
        const vistoria = await Vistoria.findById(id);

        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada.' });
        }
        
        const filial = await Filial.findById(vistoria.filial_cnpj, req.user.cnpj);
        if (!filial) {
            return res.status(403).json({ message: 'Acesso negado.' });
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
        const { cnpj: filial_cnpj } = req.params;
        const filial = await Filial.findById(filial_cnpj, req.user.cnpj);
        if (!filial) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }
        const inventario = await InsumoFilial.findByFilial(filial_cnpj);
        res.json(inventario);
    } catch (error) {
        console.error('Erro ao listar inventário:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarDetalhesVistoria = async (req, res) => {
    try {
        const { id } = req.params;
        const vistoria = await Vistoria.findById(id);
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada.' });
        }
        const filial = await Filial.findById(vistoria.filial_cnpj, req.user.cnpj);
        if (!filial) {
            return res.status(403).json({ message: 'Acesso negado.' });
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
        const { filial_cnpj } = req.body;
        
        const vistoria = await Vistoria.findById(vistoria_codigo);
        if (!vistoria) {
            return res.status(404).json({ message: 'Vistoria não encontrada.' });
        }
        if (vistoria.data_fim) {
            return res.status(403).json({ message: 'Ação proibida. Vistoria já finalizada.' });
        }

        const filial = await Filial.findById(filial_cnpj, req.user.cnpj);
        if (!filial) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        await InsumoFilial.create({
            filial_cnpj,
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

exports.excluirItemInventario = async (req, res) => {
    // Implementação da exclusão de um insumo específico (insumo_filial)
    // Requer verificações de segurança para garantir que o usuário tem permissão
    // (verificar se o insumo pertence a uma vistoria/filial da empresa do usuário)
    res.status(501).json({ message: 'Funcionalidade não implementada.' });
};
const Filial = require('../models/filialModel');
const Vistoria = require('../models/vistoriaModel');
const { Insumo, InsumoFilial } = require('../models/insumoModel');

// --- CONTROLLERS PARA FILIAIS ---
exports.listarFiliais = async (req, res) => {
    try {
        // Garante que estamos usando a variável padronizada 'empresaCnpj'
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

        // USA O MÉTODO SEGURO: Garante que o usuário só possa adicionar insumos a vistorias da sua empresa
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



exports.excluirItemInventario = async (req, res) => {
    //falta fazer
};

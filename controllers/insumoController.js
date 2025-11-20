const { Insumo } = require('../models/insumoModel');

exports.listarTiposDeInsumos = async (req, res) => {
    try {
        const insumos = await Insumo.findAllTypes();
        res.json(insumos);
    } catch (error) {
        console.error('Erro ao listar tipos de insumos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};



exports.criarTipoInsumo = async (req, res) => {
    try {
        const { descricao } = req.body;
        if (!descricao || descricao.trim() === '') {
            return res.status(400).json({ message: 'A descrição é obrigatória.' });
        }

        
        if (!req.file) {
            
            return res.status(400).json({ message: 'A imagem é obrigatória para o cadastro.' });
        }
        
        const imagemPath = `uploads/${req.file.filename}`;
        

        const novoId = await Insumo.createType(descricao, imagemPath); 
        res.status(201).json({ message: 'Tipo de insumo criado com sucesso!', id: novoId });

    } catch (error) {
        console.error('Erro ao criar tipo de insumo:', error);
        if (error.message.includes('Já existe')) {
            return res.status(409).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.atualizarTipoInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao } = req.body;
        
        if (!descricao || descricao.trim() === '') {
            return res.status(400).json({ message: 'A descrição é obrigatória.' });
        }

        let imagemPath;
        if (req.file) {
            imagemPath = `uploads/${req.file.filename}`;
        }

        const affectedRows = await Insumo.updateType(id, descricao, imagemPath); 
        
        if (affectedRows === 0) {
            
            return res.status(404).json({ message: 'Tipo de insumo não encontrado.' });
        }
        res.status(200).json({ message: 'Tipo de insumo atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar tipo de insumo:', error);
        
        if (error.message.includes('em uso') || error.message.includes('base')) {
            return res.status(403).json({ message: error.message }); 
        }
        if (error.message.includes('já está em uso')) {
            return res.status(409).json({ message: error.message }); 
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


exports.excluirTipoInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        const affectedRows = await Insumo.deleteType(id); 
        
        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Tipo de insumo não encontrado.' });
        }
        res.status(200).json({ message: 'Tipo de insumo excluído com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir tipo de insumo:', error);
        
        if (error.message.includes('base')) {
            return res.status(403).json({ message: error.message }); 
        }
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: 'Não é possível excluir. Este tipo de insumo já está em uso por itens no inventário.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

exports.buscarTipoInsumoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const tipoInsumo = await Insumo.findById(id);
        if (!tipoInsumo) {
            return res.status(404).json({ message: 'Tipo de insumo não encontrado.' });
        }
        res.json(tipoInsumo);
    } catch (error) {
        console.error('Erro ao buscar tipo de insumo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};
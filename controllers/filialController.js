const Filial = require('../models/filialModel');

function isNotEmpty(value) {
     return value !== null && value !== undefined && String(value).trim() !== ''; 
}


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
        
        const { nome, cnpj, endereco, email_responsavel } = req.body;
        if (!isNotEmpty(nome) || !isNotEmpty(cnpj) || !isNotEmpty(endereco) || !isNotEmpty(email_responsavel)) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios para criar filial.' });
        }
        

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



exports.listarLocaisPorFilial = async (req, res) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const locais = await Filial.findLocationsByFilial(filialCnpj);
        res.json(locais);
    } catch (error) {
        console.error('Erro ao listar locais da filial:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar locais.' });
    }
};
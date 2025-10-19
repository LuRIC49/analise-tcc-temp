const Filial = require('../models/filialModel');

// Middleware para verificar se a filial acessada pertence a empresa do usuario logado
// Extrai o CNPJ da filial dos param URL
exports.checkFilialOwnership = async (req, res, next) => {
    try {
        const { cnpj: filialCnpj } = req.params;
        const { empresaCnpj } = req.user;

        if (!filialCnpj) {
            return res.status(400).json({ message: "CNPJ da filial não fornecido." });
        }

        const filial = await Filial.findById(filialCnpj, empresaCnpj);

        if (!filial) {
            return res.status(404).json({ message: "Filial não encontrada ou você не tem permissão para acessá-la." });
        }

        req.filial = filial;
        next(); // continua para o próximocontroller)

    } catch (error) {
        console.error("Erro no middleware de autorização de filial:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};
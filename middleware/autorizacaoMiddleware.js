const Filial = require('../models/filialModel');

/**
 * Middleware para verificar se a filial acessada pertence à empresa do usuário logado.
 * Extrai o CNPJ da filial dos parâmetros da URL.
 */
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

        // Anexa o objeto da filial na requisição para uso posterior, se necessário
        req.filial = filial;
        next(); // Se a verificação passar, continua para o próximo handler (o controller)

    } catch (error) {
        console.error("Erro no middleware de autorização de filial:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};
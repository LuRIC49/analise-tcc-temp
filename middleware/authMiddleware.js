const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // Se não houver token, retorna um erro claro em JSON
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Se o token for inválido ou expirado, retorna um erro claro em JSON
            return res.status(403).json({ message: 'Acesso negado. Token inválido ou expirado.' });
        }
        
        // ==========================================================
        // CORREÇÃO PRINCIPAL APLICADA AQUI
        // Padroniza a propriedade no objeto req.user para camelCase
        // ==========================================================
        req.user = { empresaCnpj: user.cnpj };
        
        next(); // Continua para a próxima etapa (middleware de autorização ou controller)
    });
};
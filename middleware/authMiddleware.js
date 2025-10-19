const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // Se não houver token
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Acesso negado. Token inválido ou expirado.' });
        }
        req.user = { empresaCnpj: user.cnpj };
        
        next(); // continua para o middleware de autorização ou controller
    });
};
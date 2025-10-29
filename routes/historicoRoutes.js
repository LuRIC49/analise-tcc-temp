// routes/historicoRoutes.js
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController'); // Ou um controller específico se preferir
const { authenticateToken } = require('../middleware/authMiddleware');

// Rota para excluir um registro específico do histórico (tabela imutavel)
// Requer que a vistoria associada esteja aberta.
router.delete('/:historia_id', 
    authenticateToken, 
    inventarioController.excluirRegistroHistorico // Nova função no controller
);

module.exports = router;
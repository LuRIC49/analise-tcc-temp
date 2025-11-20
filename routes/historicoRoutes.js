const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController'); 
const { authenticateToken } = require('../middleware/authMiddleware');

router.delete('/:historia_id', authenticateToken, inventarioController.excluirRegistroHistorico);

module.exports = router;
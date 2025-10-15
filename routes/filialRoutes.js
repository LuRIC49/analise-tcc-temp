const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Lista todas as filiais da empresa logada
router.get('/', authenticateToken, inventarioController.listarFiliais);

// Cria uma nova filial para a empresa logada
router.post('/', authenticateToken, inventarioController.criarFilial);

// Busca os detalhes de UMA filial específica
router.get('/:cnpj', authenticateToken, inventarioController.buscarDetalhesFilial);

module.exports = router;
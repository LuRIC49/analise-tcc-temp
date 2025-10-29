const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');

// Lista todas as filiais da empresa logada
router.get('/', authenticateToken, inventarioController.listarFiliais);
router.get('/:cnpj/locations', authenticateToken, checkFilialOwnership, inventarioController.listarLocaisPorFilial);

// Cria uma nova filial para a empresa logada
router.post('/', authenticateToken, inventarioController.criarFilial);

// Busca os detalhes de UMA filial específica
router.get('/:cnpj', authenticateToken, inventarioController.buscarDetalhesFilial);

//relatório pdf filial inventario
router.get('/:cnpj/report', authenticateToken, checkFilialOwnership, inventarioController.gerarRelatorioInventario);

module.exports = router;
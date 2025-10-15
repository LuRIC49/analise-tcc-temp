const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Lista os tipos de insumos base para o formulário
router.get('/tipos', authenticateToken, inventarioController.listarTiposDeInsumos);

// Lista todos os insumos de uma filial (o inventário geral)
router.get('/filial/:cnpj', authenticateToken, inventarioController.listarInventario);

// Exclui um item do inventário pelo seu ID único
router.delete('/:id', authenticateToken, inventarioController.excluirItemInventario);


module.exports = router;
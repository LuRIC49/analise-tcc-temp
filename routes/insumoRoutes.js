const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');

router.get('/tipos', authenticateToken, inventarioController.listarTiposDeInsumos);
router.get('/filial/:cnpj', authenticateToken, inventarioController.listarInventario);
router.get('/:id', authenticateToken, inventarioController.buscarInsumoPorId);


router.put('/:id', authenticateToken, inventarioController.editarInsumo);

router.post('/filial/:cnpj/direto', authenticateToken, checkFilialOwnership, inventarioController.adicionarInsumoDireto);

// Exclui um item do inventário pelo seu ID único
router.delete('/:id', authenticateToken, inventarioController.excluirItemInventario);

module.exports = router;
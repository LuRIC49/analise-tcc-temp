const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');


router.get('/filial/:cnpj', authenticateToken, inventarioController.listarVistorias);
router.get('/:id', authenticateToken, inventarioController.buscarDetalhesVistoria);
router.get('/filial/:cnpj', authenticateToken, checkFilialOwnership, inventarioController.listarVistorias);


router.post('/filial/:cnpj', authenticateToken, inventarioController.iniciarNovaVistoria);
router.post('/:id/insumos', authenticateToken, inventarioController.adicionarInsumoAVistoria);
router.post('/filial/:cnpj', authenticateToken, checkFilialOwnership, inventarioController.iniciarNovaVistoria);


router.put('/:id/finalizar', authenticateToken, inventarioController.finalizarVistoria);


router.delete('/:id', authenticateToken, inventarioController.excluirVistoria);

module.exports = router;
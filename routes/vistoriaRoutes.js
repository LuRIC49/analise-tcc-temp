const express = require('express');
const router = express.Router();
const vistoriaController = require('../controllers/vistoriaController');
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');


router.get('/filial/:cnpj', authenticateToken, vistoriaController.listarVistorias);
router.get('/:id', authenticateToken, vistoriaController.buscarDetalhesVistoria);



router.post('/:id/insumos', authenticateToken, vistoriaController.adicionarInsumoAVistoria);
router.post('/filial/:cnpj', authenticateToken, checkFilialOwnership, vistoriaController.iniciarNovaVistoria);


router.put('/:id/finalizar', authenticateToken, vistoriaController.finalizarVistoria);

router.delete('/:id', authenticateToken, vistoriaController.excluirVistoria);

module.exports = router;
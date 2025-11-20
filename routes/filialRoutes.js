const express = require('express');
const router = express.Router();
const filialController = require('../controllers/filialController');
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');

router.get('/', authenticateToken, filialController.listarFiliais);
router.get('/:cnpj/locations', authenticateToken, checkFilialOwnership, filialController.listarLocaisPorFilial);
router.get('/:cnpj', authenticateToken, filialController.buscarDetalhesFilial);
router.get('/:cnpj/report', authenticateToken, checkFilialOwnership, inventarioController.gerarRelatorioInventario);


router.post('/', authenticateToken, filialController.criarFilial);

module.exports = router;
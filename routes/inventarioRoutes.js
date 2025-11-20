const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');


router.get('/filiais', authenticateToken, inventarioController.listarFiliais);
router.get('/filiais/:cnpj/inventario', authenticateToken, inventarioController.listarInventario);
router.get('/filiais/:cnpj', authenticateToken, inventarioController.buscarDetalhesFilial);
router.get('/filiais/:cnpj/vistorias', authenticateToken, inventarioController.listarVistorias);
router.get('/vistorias/:id', authenticateToken, inventarioController.buscarDetalhesVistoria);
router.get('/insumos', authenticateToken, inventarioController.listarTiposDeInsumos);


router.post('/filiais', authenticateToken, inventarioController.criarFilial);
router.post('/filiais/:cnpj/inventario', authenticateToken, inventarioController.adicionarItemInventario);
router.post('/filiais/:cnpj/vistorias', authenticateToken, inventarioController.iniciarNovaVistoria);
router.post('/vistorias/:id/insumos', authenticateToken, inventarioController.adicionarInsumoAVistoria);



router.put('/vistorias/:id/finalizar', authenticateToken, inventarioController.finalizarVistoria);

router.delete('/inventario/:id', authenticateToken, inventarioController.excluirItemInventario);


module.exports = router;
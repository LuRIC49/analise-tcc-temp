const express = require('express');
const router = express.Router();
const insumoController = require('../controllers/insumoController');
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');

const upload = require('../config/multerConfig'); 


router.get('/tipos', authenticateToken, insumoController.listarTiposDeInsumos);
router.get('/public-tipos', insumoController.listarTiposDeInsumos);
router.get('/tipos/:id', authenticateToken, insumoController.buscarTipoInsumoPorId);
router.get('/:id', authenticateToken, inventarioController.buscarInsumoPorId);
router.get('/:id/historico', authenticateToken, inventarioController.buscarHistoricoInsumo);
router.get('/filial/:cnpj', authenticateToken, checkFilialOwnership, inventarioController.listarInventario);
router.get('/filial/:cnpj/seriais', authenticateToken, checkFilialOwnership, inventarioController.listarSeriaisPorFilial);
router.get('/filial/:cnpj/seriais-por-tipo', authenticateToken, checkFilialOwnership, inventarioController.listarSeriaisPorFilialETipo);


router.post('/tipos', authenticateToken, upload.single('imagem'), insumoController.criarTipoInsumo);
router.post('/filial/:cnpj/direto', authenticateToken, checkFilialOwnership, inventarioController.adicionarInsumoDireto);


router.put('/tipos/:id', authenticateToken, upload.single('imagem'), insumoController.atualizarTipoInsumo);
router.put('/:id', authenticateToken, inventarioController.editarInsumo);

router.delete('/tipos/:id', authenticateToken, insumoController.excluirTipoInsumo);
router.delete('/:id', authenticateToken, inventarioController.excluirItemInventario);

module.exports = router;
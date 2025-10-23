const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');

// Rota para buscar os TIPOS de insumo (Extintor, Mangueira, etc)
router.get('/tipos', authenticateToken, inventarioController.listarTiposDeInsumos);

// Rota para buscar UM insumo específico pelo seu ID (da tabela mutavel)
router.get('/:id', authenticateToken, inventarioController.buscarInsumoPorId);

router.get('/:id/historico', authenticateToken, inventarioController.buscarHistoricoInsumo);
// Rota para buscar o INVENTÁRIO ATUAL (mutavel) de uma filial
router.get('/filial/:cnpj', authenticateToken, checkFilialOwnership, inventarioController.listarInventario);

// [NOVA ROTA] Rota para buscar os seriais de uma filial (para autocomplete)
router.get('/filial/:cnpj/seriais', authenticateToken, checkFilialOwnership, inventarioController.listarSeriaisPorFilial);

// Rota para ADICIONAR um insumo direto ao inventário (sem vistoria)
router.post('/filial/:cnpj/direto', authenticateToken, checkFilialOwnership, inventarioController.adicionarInsumoDireto);

// Rota para EDITAR um insumo (mutavel) e LOGAR no (imutavel)
router.put('/:id', authenticateToken, inventarioController.editarInsumo);

// Rota para EXCLUIR um insumo do inventário (apenas da tabela mutavel)
router.delete('/:id', authenticateToken, inventarioController.excluirItemInventario);

module.exports = router;
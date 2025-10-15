const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Lista todas as vistorias de uma filial
router.get('/filial/:cnpj', authenticateToken, inventarioController.listarVistorias);

// Cria uma nova vistoria para uma filial
router.post('/filial/:cnpj', authenticateToken, inventarioController.iniciarNovaVistoria);

// Busca os detalhes de uma vistoria e seus insumos
router.get('/:id', authenticateToken, inventarioController.buscarDetalhesVistoria);

// Finaliza uma vistoria (atualiza a data_fim)
router.put('/:id/finalizar', authenticateToken, inventarioController.finalizarVistoria);

// Exclui uma vistoria
router.delete('/:id', authenticateToken, inventarioController.excluirVistoria);

// Adiciona um insumo a uma vistoria (esta rota poderia estar em insumos também, mas faz sentido aqui)
router.post('/:id/insumos', authenticateToken, inventarioController.adicionarInsumoAVistoria);

module.exports = router;
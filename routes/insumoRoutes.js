const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkFilialOwnership } = require('../middleware/autorizacaoMiddleware');

// --- Importe a configuração do multer ---
// (Ajuste o caminho se o seu 'multerConfig.js' estiver em outro lugar)
const upload = require('../config/multerConfig'); 

// Rota para buscar os TIPOS de insumo (Extintor, Mangueira, etc)
router.get('/tipos', authenticateToken, inventarioController.listarTiposDeInsumos); 

router.get('/public-tipos', inventarioController.listarTiposDeInsumos)

// C - Criar um novo tipo de insumo (com upload de imagem)
router.post('/tipos', authenticateToken, upload.single('imagem'), inventarioController.criarTipoInsumo);

// R - Buscar UM tipo de insumo por ID
router.get('/tipos/:id', authenticateToken, inventarioController.buscarTipoInsumoPorId);

// U - Atualizar um tipo de insumo (com upload de imagem)
router.put('/tipos/:id', authenticateToken, upload.single('imagem'), inventarioController.atualizarTipoInsumo);

// D - Excluir um tipo de insumo
router.delete('/tipos/:id', authenticateToken, inventarioController.excluirTipoInsumo);

// --- FIM DAS NOVAS ROTAS ---


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
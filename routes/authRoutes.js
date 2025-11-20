const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');


router.get('/meu-perfil', authenticateToken, authController.buscarPerfil);

router.post('/registrar-empresa', authController.registrarEmpresa);
router.post('/login', authController.loginUsuario);

router.put('/perfil/email', authenticateToken, authController.alterarEmail);
router.put('/perfil/senha', authenticateToken, authController.alterarSenha);

module.exports = router;



const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register-company', authController.registrarEmpresa);
router.post('/login', authController.loginUsuario);
router.get('/meu-perfil', authenticateToken, authController.buscarPerfil);


router.put('/perfil/email', authenticateToken, authController.alterarEmail);

router.put('/perfil/senha', authenticateToken, authController.alterarSenha);

module.exports = router;



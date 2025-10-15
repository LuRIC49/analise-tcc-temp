const express = require('express');

const router = express.Router();

const dataController = require('../controllers/dataController');


router.get('/types', dataController.getTypes);


module.exports = router;

const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController.js');

router.get('/', homeController.index);
// Adicione mais rotas conforme necessário

module.exports = router;

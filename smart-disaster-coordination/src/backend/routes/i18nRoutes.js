const express = require('express');
const { translateTexts } = require('../controllers/i18nController');

const router = express.Router();

router.post('/translate', translateTexts);

module.exports = router;

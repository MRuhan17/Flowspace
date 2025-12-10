const express = require('express');
const router = express.Router();
const aiController = require('../ai/aiController');

// AI text processing endpoints
router.post('/summarize', aiController.summarize);
router.post('/rewrite', aiController.rewrite);
router.post('/generateNote', aiController.generateStickyNote);

module.exports = router;

import express from 'express';
import * as layoutController from '../controllers/layoutController.js';

const router = express.Router();

router.post('/auto-layout', layoutController.autoLayout);

export default router;

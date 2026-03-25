import express from 'express';
import organizerController from '../controllers/organizerController.js';

const router = express.Router();

/**
 * @swagger
 * /api/organizer/dashboard:
 *   get:
 *     summary: Tableau de bord organisateur avec KPIs et convois récents
 *     tags: [Organizer]
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', organizerController.getDashboard);

export default router;

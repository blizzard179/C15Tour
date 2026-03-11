const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');

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

module.exports = router;

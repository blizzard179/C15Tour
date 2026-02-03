const express = require('express');
const router = express.Router();
const geocodeController = require('../controllers/geocodeController');

/**
 * @swagger
 * /api/geocode/search:
 *   get:
 *     summary: Rechercher une adresse (géocodage)
 *     tags: [Geocode]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Texte de recherche d'adresse
 *     responses:
 *       200:
 *         description: Liste des résultats
 */
router.get('/search', geocodeController.searchAddress);

/**
 * @swagger
 * /api/geocode/reverse:
 *   get:
 *     summary: Géocodage inverse (coordonnées -> adresse)
 *     tags: [Geocode]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lon
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *     responses:
 *       200:
 *         description: Adresse trouvée
 */
router.get('/reverse', geocodeController.reverseGeocode);

module.exports = router;

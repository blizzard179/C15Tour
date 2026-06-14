import express from 'express';
import tripController from '../controllers/tripController.js';
import routingController from '../controllers/routingController.js';
import exportController from '../controllers/exportController.js';
import telemetryController from '../controllers/telemetryController.js';
import { validateTrip, validateTelemetry } from '../middlewares/validation.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       properties:
 *         trip_id:
 *           type: integer
 *         trip_name:
 *           type: string
 *         trip_speed:
 *           type: integer
 *         trip_user_code:
 *           type: string
 *         trip_admin_code:
 *           type: string
 *         trip_start_time:
 *           type: string
 *           format: date-time
 *         trip_autoroute:
 *           type: boolean
 *         trip_voie_rapide:
 *           type: boolean
 *         trip_chemin:
 *           type: boolean
 *         trip_is_reduced:
 *           type: boolean
 *         trip_reduction:
 *           type: integer
 *         trip_nb_sections:
 *           type: integer
 *         trip_created_at:
 *           type: string
 *           format: date-time
 *         trip_updated_at:
 *           type: string
 *           format: date-time
 *     TripInput:
 *       type: object
 *       required:
 *         - trip_name
 *       properties:
 *         trip_name:
 *           type: string
 *           maxLength: 100
 *         trip_speed:
 *           type: integer
 *         trip_start_time:
 *           type: string
 *           format: date-time
 *         trip_autoroute:
 *           type: boolean
 *           default: true
 *         trip_voie_rapide:
 *           type: boolean
 *           default: true
 *         trip_chemin:
 *           type: boolean
 *           default: false
 *         trip_is_reduced:
 *           type: boolean
 *           default: false
 *         trip_reduction:
 *           type: integer
 *           default: 0
 *         trip_nb_sections:
 *           type: integer
 *           default: 1
 */

/**
 * @swagger
 * /api/trips:
 *   get:
 *     summary: Récupérer tous les convois
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: Liste des convois
 */
router.get('/', tripController.getAllTrips);

/**
 * @swagger
 * /api/trips/last:
 *   get:
 *     summary: Récupérer le dernier convoi créé
 *     tags: [Trips]
 *     responses:
 *       200:
 *         description: Dernier convoi
 *       404:
 *         description: Aucun convoi trouvé
 */
router.get('/last', tripController.getLastTrip);

/**
 * @swagger
 * /api/trips/search:
 *   get:
 *     summary: Rechercher des convois par nom
 *     tags: [Trips]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Texte à rechercher dans le nom
 *     responses:
 *       200:
 *         description: Liste des convois correspondants
 */
router.get('/search', tripController.searchTrips);

/**
 * @swagger
 * /api/trips/code/{userCode}:
 *   get:
 *     summary: Récupérer un convoi par code utilisateur
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: userCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Convoi trouvé
 *       404:
 *         description: Convoi non trouvé
 */
router.get('/code/:userCode', tripController.getTripByUserCode);

/**
 * @swagger
 * /api/trips/admin/{adminCode}:
 *   get:
 *     summary: Récupérer un convoi par code admin
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: adminCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Convoi trouvé
 *       404:
 *         description: Convoi non trouvé
 */
router.get('/admin/:adminCode', tripController.getTripByAdminCode);

/**
 * @swagger
 * /api/trips/{id}:
 *   get:
 *     summary: Récupérer un convoi par ID
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Convoi trouvé
 *       404:
 *         description: Convoi non trouvé
 */
router.get('/:id', tripController.getTripById);

/**
 * @swagger
 * /api/trips:
 *   post:
 *     summary: Créer un nouveau convoi
 *     tags: [Trips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TripInput'
 *     responses:
 *       201:
 *         description: Convoi créé
 *       400:
 *         description: Données invalides
 */
router.post('/', validateTrip, tripController.createTrip);

/**
 * @swagger
 * /api/trips/{id}:
 *   put:
 *     summary: Modifier un convoi
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TripInput'
 *     responses:
 *       200:
 *         description: Convoi modifié
 *       404:
 *         description: Convoi non trouvé
 */
router.put('/:id', validateTrip, tripController.updateTrip);

/**
 * @swagger
 * /api/trips/{id}:
 *   delete:
 *     summary: Supprimer un convoi
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Convoi supprimé
 *       404:
 *         description: Convoi non trouvé
 */
router.delete('/:id', tripController.deleteTrip);

/**
 * @swagger
 * /api/trips/{id}/regenerate-code:
 *   post:
 *     summary: Régénérer le code utilisateur
 *     tags: [Trips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Code régénéré
 *       404:
 *         description: Convoi non trouvé
 */
router.post('/:id/regenerate-code', tripController.regenerateUserCode);

/**
 * @swagger
 * /api/trips/{tripId}/compute:
 *   post:
 *     summary: Calculer l'itinéraire d'un convoi
 *     tags: [Trips]
 */
router.post('/:tripId/compute', routingController.computeRoute);

/**
 * @swagger
 * /api/trips/{tripId}/exports/pdf:
 *   get:
 *     summary: Exporter un convoi en PDF
 *     tags: [Trips]
 */
router.get('/:tripId/exports/pdf', exportController.exportToPDF);

/**
 * @swagger
 * /api/trips/{tripId}/exports/gpx:
 *   get:
 *     summary: Exporter un convoi en GPX
 *     tags: [Trips]
 */
router.get('/:tripId/exports/gpx', exportController.exportToGPX);

/**
 * @swagger
 * /api/trips/{tripId}/telemetry:
 *   post:
 *     summary: Enregistrer une position GPS
 *     tags: [Trips]
 */
router.post('/:tripId/telemetry', validateTelemetry, telemetryController.createTelemetry);

/**
 * @swagger
 * /api/trips/{tripId}/telemetry/latest:
 *   get:
 *     summary: Récupérer la dernière position GPS d'un convoi
 *     tags: [Trips]
 */
router.get('/:tripId/telemetry/latest', telemetryController.getLatestTelemetryByTrip);

/**
 * @swagger
 * /api/trips/{tripId}/telemetry:
 *   get:
 *     summary: Récupérer les positions GPS d'un convoi
 *     tags: [Trips]
 */
router.get('/:tripId/telemetry', telemetryController.getTelemetryByTrip);

export default router;

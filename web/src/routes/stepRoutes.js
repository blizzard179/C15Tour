const express = require('express');
const router = express.Router();
const stepController = require('../controllers/stepController');
const { validateStep, validateStepUpdate, validateReorder } = require('../middlewares/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     Step:
 *       type: object
 *       properties:
 *         step_id:
 *           type: integer
 *         step_name:
 *           type: string
 *         step_address:
 *           type: string
 *         step_latitude:
 *           type: number
 *           format: decimal
 *         step_longitude:
 *           type: number
 *           format: decimal
 *         step_is_stop:
 *           type: boolean
 *         step_stop_duration:
 *           type: integer
 *         step_order:
 *           type: integer
 *         step_trip_id:
 *           type: integer
 *         step_created_at:
 *           type: string
 *           format: date-time
 *         step_updated_at:
 *           type: string
 *           format: date-time
 *     StepInput:
 *       type: object
 *       required:
 *         - step_name
 *         - step_address
 *         - step_latitude
 *         - step_longitude
 *       properties:
 *         step_name:
 *           type: string
 *           maxLength: 100
 *         step_address:
 *           type: string
 *           maxLength: 255
 *         step_latitude:
 *           type: number
 *           format: decimal
 *           minimum: -90
 *           maximum: 90
 *         step_longitude:
 *           type: number
 *           format: decimal
 *           minimum: -180
 *           maximum: 180
 *         step_is_stop:
 *           type: boolean
 *           default: false
 *         step_stop_duration:
 *           type: integer
 *           nullable: true
 *         step_order:
 *           type: integer
 *           nullable: true
 */

/**
 * @swagger
 * /api/trips/{tripId}/steps:
 *   get:
 *     summary: Récupérer les étapes d'un convoi
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des étapes
 *       404:
 *         description: Convoi non trouvé
 */
router.get('/trips/:tripId/steps', stepController.getStepsByTrip);

/**
 * @swagger
 * /api/trips/{tripId}/stops:
 *   get:
 *     summary: Récupérer les pauses d'un convoi
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des pauses
 *       404:
 *         description: Convoi non trouvé
 */
router.get('/trips/:tripId/stops', stepController.getStopsByTrip);

/**
 * @swagger
 * /api/trips/{tripId}/steps:
 *   post:
 *     summary: Ajouter une étape à un convoi
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StepInput'
 *     responses:
 *       201:
 *         description: Étape créée
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Convoi non trouvé
 */
router.post('/trips/:tripId/steps', validateStep, stepController.createStep);

/**
 * @swagger
 * /api/trips/{tripId}/steps/reorder:
 *   put:
 *     summary: Réorganiser les étapes d'un convoi
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stepIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Étapes réorganisées
 *       404:
 *         description: Convoi non trouvé
 */
router.put('/trips/:tripId/steps/reorder', validateReorder, stepController.reorderSteps);

/**
 * @swagger
 * /api/steps/{id}:
 *   get:
 *     summary: Récupérer une étape par ID
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Étape trouvée
 *       404:
 *         description: Étape non trouvée
 */
router.get('/steps/:id', stepController.getStepById);

/**
 * @swagger
 * /api/steps/{id}:
 *   put:
 *     summary: Modifier une étape
 *     tags: [Steps]
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
 *             $ref: '#/components/schemas/StepInput'
 *     responses:
 *       200:
 *         description: Étape modifiée
 *       404:
 *         description: Étape non trouvée
 */
router.put('/steps/:id', validateStepUpdate, stepController.updateStep);

/**
 * @swagger
 * /api/steps/{id}:
 *   delete:
 *     summary: Supprimer une étape
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Étape supprimée
 *       404:
 *         description: Étape non trouvée
 */
router.delete('/steps/:id', stepController.deleteStep);

module.exports = router;

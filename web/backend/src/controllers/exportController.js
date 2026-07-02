import exportService from '../services/exportService.js';

// Contrôleurs d'export d'un trajet : délèguent la génération du fichier au
// service dédié et renvoient directement le binaire (PDF/GPX) en réponse HTTP.

// POST /api/trip/:tripId/exports/pdf
const exportToPDF = async (req, res, next) => {
  try {
    const mapImageBase64 = req.body?.mapImage || null;
    const mapImageBuffer = mapImageBase64 ? Buffer.from(mapImageBase64, 'base64') : null;
    const pdfBuffer = await exportService.exportToPDF(req.params.tripId, mapImageBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="trip-${req.params.tripId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// GET /api/trip/:tripId/exports/gpx
const exportToGPX = async (req, res, next) => {
  try {
    const gpxBuffer = await exportService.exportToGPX(req.params.tripId);

    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="trip-${req.params.tripId}.gpx"`);
    res.send(gpxBuffer);
  } catch (error) {
    next(error);
  }
};

export default {
  exportToPDF,
  exportToGPX
};

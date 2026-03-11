import exportService from '../services/exportService.js';

// GET /api/trip/:tripId/exports/pdf
const exportToPDF = async (req, res, next) => {
  try {
    const pdfBuffer = await exportService.exportToPDF(req.params.tripId);

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

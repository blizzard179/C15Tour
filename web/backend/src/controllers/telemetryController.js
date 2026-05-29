import telemetryService from '../services/telemetryService.js';

// POST /api/trip/:tripId/telemetry
const createTelemetry = async (req, res, next) => {
  try {
    const telemetry = await telemetryService.createTelemetry(req.params.tripId, req.body);
    res.status(201).json(telemetry);
  } catch (error) {
    next(error);
  }
};

// GET /api/trip/:tripId/telemetry?since=...
const getTelemetryByTrip = async (req, res, next) => {
  try {
    const telemetry = await telemetryService.getTelemetryByTrip(req.params.tripId, req.query.since);
    res.json(telemetry);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/:tripId/telemetry/latest
const getLatestTelemetryByTrip = async (req, res, next) => {
  try {
    const telemetry = await telemetryService.getLatestTelemetryByTrip(req.params.tripId);

    if (!telemetry) {
      return res.status(404).json({ message: 'Position non disponible' });
    }

    res.json({
      latitude: Number(telemetry.telemetry_latitude),
      longitude: Number(telemetry.telemetry_longitude),
      timestamp: telemetry.telemetry_timestamp,
      heading: telemetry.telemetry_heading
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createTelemetry,
  getTelemetryByTrip,
  getLatestTelemetryByTrip
};

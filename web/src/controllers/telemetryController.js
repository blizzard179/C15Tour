const telemetryService = require('../services/telemetryService');

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

module.exports = {
  createTelemetry,
  getTelemetryByTrip
};

const routingService = require('../services/routingService');

// POST /api/trip/:tripId/compute
const computeRoute = async (req, res, next) => {
  try {
    const route = await routingService.computeRoute(req.params.tripId);
    res.json(route);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  computeRoute
};

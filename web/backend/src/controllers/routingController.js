import routingService from '../services/routingService.js';

// POST /api/trip/:tripId/compute
const computeRoute = async (req, res, next) => {
  try {
    const route = await routingService.computeRoute(req.params.tripId);
    res.json(route);
  } catch (error) {
    next(error);
  }
};

export default {
  computeRoute
};

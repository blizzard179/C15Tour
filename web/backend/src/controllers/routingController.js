import routingService from '../services/routingService.js';

// Contrôleur de calcul d'itinéraire côté serveur (via OSRM), utilisé par
// l'application mobile pour récupérer distance/durée/tracé d'un trajet enregistré.

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

import organizerService from '../services/organizerService.js';

// Contrôleur du tableau de bord organisateur (vue d'ensemble des trajets)

// GET /api/organizer/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await organizerService.getDashboard();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboard
};

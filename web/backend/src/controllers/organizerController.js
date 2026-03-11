const organizerService = require('../services/organizerService');

// GET /api/organizer/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await organizerService.getDashboard();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};

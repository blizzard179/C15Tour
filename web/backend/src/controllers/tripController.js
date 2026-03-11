import tripService from '../services/tripService.js';

// GET /api/trips
const getAllTrips = async (req, res, next) => {
  try {
    const trips = await tripService.getAllTrips();
    res.json(trips);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/:id
const getTripById = async (req, res, next) => {
  try {
    const trip = await tripService.getTripById(req.params.id);
    res.json(trip);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/last
const getLastTrip = async (req, res, next) => {
  try {
    const trip = await tripService.getLastTrip();
    res.json(trip);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/code/:userCode
const getTripByUserCode = async (req, res, next) => {
  try {
    const trip = await tripService.getTripByUserCode(req.params.userCode);
    res.json(trip);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/admin/:adminCode
const getTripByAdminCode = async (req, res, next) => {
  try {
    const trip = await tripService.getTripByAdminCode(req.params.adminCode);
    res.json(trip);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/search?name=xxx
const searchTrips = async (req, res, next) => {
  try {
    const trips = await tripService.searchTripsByName(req.query.name || '');
    res.json(trips);
  } catch (error) {
    next(error);
  }
};

// POST /api/trips
const createTrip = async (req, res, next) => {
  try {
    const trip = await tripService.createTrip(req.body);
    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
};

// PUT /api/trips/:id
const updateTrip = async (req, res, next) => {
  try {
    const trip = await tripService.updateTrip(req.params.id, req.body);
    res.json(trip);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/trips/:id
const deleteTrip = async (req, res, next) => {
  try {
    await tripService.deleteTrip(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// POST /api/trips/:id/regenerate-code
const regenerateUserCode = async (req, res, next) => {
  try {
    const trip = await tripService.regenerateUserCode(req.params.id);
    res.json(trip);
  } catch (error) {
    next(error);
  }
};

export default {
  getAllTrips,
  getTripById,
  getLastTrip,
  getTripByUserCode,
  getTripByAdminCode,
  searchTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  regenerateUserCode
};

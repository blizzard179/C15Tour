import stepService from '../services/stepService.js';

// GET /api/trips/:tripId/steps
const getStepsByTrip = async (req, res, next) => {
  try {
    const steps = await stepService.getStepsByTripId(req.params.tripId);
    res.json(steps);
  } catch (error) {
    next(error);
  }
};

// GET /api/trips/:tripId/stops
const getStopsByTrip = async (req, res, next) => {
  try {
    const stops = await stepService.getStopsByTripId(req.params.tripId);
    res.json(stops);
  } catch (error) {
    next(error);
  }
};

// GET /api/steps/:id
const getStepById = async (req, res, next) => {
  try {
    const step = await stepService.getStepById(req.params.id);
    res.json(step);
  } catch (error) {
    next(error);
  }
};

// POST /api/trips/:tripId/steps
const createStep = async (req, res, next) => {
  try {
    const step = await stepService.createStep(req.params.tripId, req.body);
    res.status(201).json(step);
  } catch (error) {
    next(error);
  }
};


// PUT /api/steps/:id
const updateStep = async (req, res, next) => {
  try {
    const step = await stepService.updateStep(req.params.id, req.body);
    res.json(step);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/steps/:id
const deleteStep = async (req, res, next) => {
  try {
    await stepService.deleteStep(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};


// PUT /api/trips/:tripId/steps/reorder
const reorderSteps = async (req, res, next) => {
  try {
    const steps = await stepService.reorderSteps(req.params.tripId, req.body.stepIds);
    res.json(steps);
  } catch (error) {
    next(error);
  }
};

export default {
  getStepsByTrip,
  getStopsByTrip,
  getStepById,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps
};

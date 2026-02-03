const prisma = require('../config/database');

// Récupérer toutes les étapes d'un trip
const getStepsByTripId = async (tripId) => {
  // Vérifier que le trip existe
  const trip = await prisma.trip.findUnique({ where: { trip_id: parseInt(tripId) } });
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }
  
  return prisma.step.findMany({
    where: { step_trip_id: parseInt(tripId) },
    orderBy: { step_order: 'asc' }
  });
};

// Récupérer une étape par ID
const getStepById = async (id) => {
  const step = await prisma.step.findUnique({
    where: { step_id: parseInt(id) }
  });
  
  if (!step) {
    throw { status: 404, message: 'Étape non trouvée' };
  }
  
  return step;
};

// Récupérer les pauses d'un trip
const getStopsByTripId = async (tripId) => {
  const trip = await prisma.trip.findUnique({ where: { trip_id: parseInt(tripId) } });
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }
  
  return prisma.step.findMany({
    where: { 
      step_trip_id: parseInt(tripId),
      step_is_stop: true
    },
    orderBy: { step_order: 'asc' }
  });
};

// Créer une étape
const createStep = async (tripId, data) => {
  // Vérifier que le trip existe
  const trip = await prisma.trip.findUnique({ where: { trip_id: parseInt(tripId) } });
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }
  
  // Trouver l'ordre maximum actuel
  const maxOrderResult = await prisma.step.aggregate({
    where: { step_trip_id: parseInt(tripId) },
    _max: { step_order: true }
  });
  const nextOrder = (maxOrderResult._max.step_order || 0) + 1;
  
  return prisma.step.create({
    data: {
      step_name: data.step_name,
      step_address: data.step_address,
      step_latitude: data.step_latitude,
      step_longitude: data.step_longitude,
      step_is_stop: data.step_is_stop ?? false,
      step_stop_duration: data.step_stop_duration ?? null,
      step_order: data.step_order ?? nextOrder,
      step_trip_id: parseInt(tripId)
    }
  });
};

// Modifier une étape
const updateStep = async (id, data) => {
  await getStepById(id);
  
  return prisma.step.update({
    where: { step_id: parseInt(id) },
    data: {
      step_name: data.step_name,
      step_address: data.step_address,
      step_latitude: data.step_latitude,
      step_longitude: data.step_longitude,
      step_is_stop: data.step_is_stop,
      step_stop_duration: data.step_stop_duration,
      step_order: data.step_order
    }
  });
};

// Supprimer une étape
const deleteStep = async (id) => {
  const step = await getStepById(id);
  const tripId = step.step_trip_id;
  const deletedOrder = step.step_order;
  
  await prisma.step.delete({ where: { step_id: parseInt(id) } });
  
  // Réorganiser les ordres des étapes restantes
  await prisma.step.updateMany({
    where: {
      step_trip_id: tripId,
      step_order: { gt: deletedOrder }
    },
    data: {
      step_order: { decrement: 1 }
    }
  });
  
  return { message: 'Étape supprimée' };
};

// Réorganiser les étapes
const reorderSteps = async (tripId, stepIds) => {
  const trip = await prisma.trip.findUnique({ where: { trip_id: parseInt(tripId) } });
  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }
  
  // Mettre à jour l'ordre de chaque étape
  for (let i = 0; i < stepIds.length; i++) {
    await prisma.step.update({
      where: { step_id: parseInt(stepIds[i]) },
      data: { step_order: i + 1 }
    });
  }
  
  return getStepsByTripId(tripId);
};

module.exports = {
  getStepsByTripId,
  getStepById,
  getStopsByTripId,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps
};

import prisma from '../config/database.js';

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

  const stepOrder = data.step_order ?? nextOrder;

  // Vérifier que l'order n'existe pas déjà pour ce trip
  if (data.step_order != null) {
    const existingStep = await prisma.step.findFirst({
      where: { step_trip_id: parseInt(tripId), step_order: stepOrder }
    });
    if (existingStep) {
      throw { status: 400, message: `Une étape avec l'ordre ${stepOrder} existe déjà pour ce trip` };
    }
  }

  // Cohérence is_stop / stop_duration
  const isStop = data.step_is_stop ?? false;
  let stopDuration = data.step_stop_duration ?? null;
  if (isStop && (stopDuration == null || stopDuration == 0)) {
    throw { status: 400, message: 'La durée de pause est obligatoire quand is_stop est true' };
  }
  if (!isStop) {
    stopDuration = null;
  }

  // Si pas de nom, utiliser l'adresse
  const stepName = data.step_name || data.step_address;

  return prisma.step.create({
    data: {
      step_name: stepName,
      step_address: data.step_address,
      step_latitude: data.step_latitude,
      step_longitude: data.step_longitude,
      step_is_stop: isStop,
      step_stop_duration: stopDuration,
      step_order: stepOrder,
      step_trip_id: parseInt(tripId)
    }
  });
};

// Modifier une étape
const updateStep = async (id, data) => {
  const existingStep = await getStepById(id);

  // Construire uniquement les champs fournis (update partiel)
  const updateData = {};
  if (data.step_name !== undefined) updateData.step_name = data.step_name;
  if (data.step_address !== undefined) updateData.step_address = data.step_address;
  if (data.step_latitude !== undefined) updateData.step_latitude = data.step_latitude;
  if (data.step_longitude !== undefined) updateData.step_longitude = data.step_longitude;
  if (data.step_order !== undefined) updateData.step_order = data.step_order;

  // Vérifier unicité de l'order si modifié
  if (data.step_order !== undefined) {
    const conflicting = await prisma.step.findFirst({
      where: {
        step_trip_id: existingStep.step_trip_id,
        step_order: data.step_order,
        step_id: { not: parseInt(id) }
      }
    });
    if (conflicting) {
      throw { status: 400, message: `Une étape avec l'ordre ${data.step_order} existe déjà pour ce trip` };
    }
  }

  // Cohérence is_stop / stop_duration
  const isStop = data.step_is_stop !== undefined ? data.step_is_stop : existingStep.step_is_stop;
  const stopDuration = data.step_stop_duration !== undefined ? data.step_stop_duration : existingStep.step_stop_duration;

  if (data.step_is_stop !== undefined || data.step_stop_duration !== undefined) {
    if (isStop && stopDuration == null) {
      throw { status: 400, message: 'La durée de pause est obligatoire quand is_stop est true' };
    }
    updateData.step_is_stop = isStop;
    updateData.step_stop_duration = isStop ? stopDuration : null;
  }

  return prisma.step.update({
    where: { step_id: parseInt(id) },
    data: updateData
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

export default {
  getStepsByTripId,
  getStepById,
  getStopsByTripId,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps
};

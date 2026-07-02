import prisma from '../config/database.js';

// Logique métier de la télémétrie : historique des positions GPS envoyées
// par l'application mobile pendant un trajet (suivi en direct du convoi).

// Enregistrer une position GPS
const createTelemetry = async (tripId, data) => {
  // Vérifier que le trip existe
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(tripId) }
  });

  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }

  return prisma.telemetry.create({
    data: {
      telemetry_trip_id: parseInt(tripId),
      telemetry_latitude: data.latitude,
      telemetry_longitude: data.longitude,
      telemetry_speed: data.speed ?? null,
      telemetry_heading: data.heading ?? null,
      telemetry_timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
    }
  });
};

// Récupérer les positions GPS d'un trip
const getTelemetryByTrip = async (tripId, since) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(tripId) }
  });

  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }

  const whereClause = {
    telemetry_trip_id: parseInt(tripId)
  };

  // Filtre optionnel par date
  if (since) {
    whereClause.telemetry_timestamp = {
      gte: new Date(since)
    };
  }

  return prisma.telemetry.findMany({
    where: whereClause,
    orderBy: { telemetry_timestamp: 'asc' }
  });
};

// Récupérer la dernière position GPS d'un trip
const getLatestTelemetryByTrip = async (tripId) => {
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(tripId) }
  });

  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }

  return prisma.telemetry.findFirst({
    where: {
      telemetry_trip_id: parseInt(tripId)
    },
    orderBy: {
      telemetry_timestamp: 'desc'
    }
  });
};

export default {
  createTelemetry,
  getTelemetryByTrip,
  getLatestTelemetryByTrip
};

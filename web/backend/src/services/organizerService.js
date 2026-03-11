import prisma from '../config/database.js';

// GET /api/organizer/dashboard - Tableau de bord organisateur
const getDashboard = async () => {
  // Calculer les KPIs
  const totalTrips = await prisma.trip.count();

  const activeTrips = await prisma.trip.count({
    where: {
      trip_start_time: {
        lte: new Date(),
      }
    }
  });

  const totalSteps = await prisma.step.count();

  // Récupérer les convois récents (10 derniers)
  const recentTrips = await prisma.trip.findMany({
    take: 10,
    orderBy: { trip_created_at: 'desc' },
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });

  // Calculer le nombre total de télémétries
  const totalTelemetry = await prisma.telemetry.count();

  return {
    kpis: {
      totalTrips,
      activeTrips,
      totalSteps,
      totalTelemetry
    },
    recentTrips
  };
};

export default {
  getDashboard
};

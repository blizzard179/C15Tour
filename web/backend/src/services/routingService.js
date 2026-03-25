import axios from 'axios';
import prisma from '../config/database.js';

// Utilisation de l'API OSRM (gratuite, pas de clé nécessaire)
const OSRM_BASE_URL = 'https://router.project-osrm.org';

// Calculer l'itinéraire d'un trip
const computeRoute = async (tripId) => {
  // Récupérer le trip avec ses étapes
  const trip = await prisma.trip.findUnique({
    where: { trip_id: parseInt(tripId) },
    include: {
      steps: {
        orderBy: { step_order: 'asc' }
      }
    }
  });

  if (!trip) {
    throw { status: 404, message: 'Trip non trouvé' };
  }

  if (!trip.steps || trip.steps.length < 2) {
    throw { status: 400, message: 'Il faut au moins 2 étapes pour calculer un itinéraire' };
  }

  // Préparer les coordonnées pour OSRM (format: lon,lat;lon,lat)
  const coordinates = trip.steps.map(step =>
    `${parseFloat(step.step_longitude)},${parseFloat(step.step_latitude)}`
  ).join(';');

  try {
    // OSRM utilise le format: /route/v1/{profile}/{coordinates}
    const response = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${coordinates}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true
        }
      }
    );

    const route = response.data.routes[0];

    return {
      tripId: trip.trip_id,
      distance: (route.distance / 1000).toFixed(2), // convertir mètres en km
      duration: Math.round(route.duration), // en secondes
      geometry: route.geometry,
      steps: trip.steps.map(step => ({
        name: step.step_name,
        address: step.step_address,
        latitude: parseFloat(step.step_latitude),
        longitude: parseFloat(step.step_longitude),
        isStop: step.step_is_stop,
        stopDuration: step.step_stop_duration
      }))
    };
  } catch (error) {
    console.error('Erreur calcul itinéraire:', error.response?.data || error.message);
    throw {
      status: 500,
      message: 'Erreur lors du calcul de l\'itinéraire',
      details: error.response?.data?.message || error.message
    };
  }
};

export default {
  computeRoute
};

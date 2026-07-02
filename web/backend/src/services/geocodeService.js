import axios from 'axios';

// Service de géocodage côté serveur (recherche d'adresse et géocodage inverse),
// utilisé notamment par l'application mobile qui ne fait pas ces appels en direct.
// Utilisation de l'API Nominatim d'OpenStreetMap
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Recherche d'adresse (géocodage direct)
const searchAddress = async (query) => {
  if (!query || query.trim().length === 0) {
    throw { status: 400, message: 'Le paramètre de recherche est obligatoire' };
  }

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 10
      },
      headers: {
        'User-Agent': 'C15Tour/1.0'
      }
    });

    return response.data.map(item => ({
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
      importance: item.importance
    }));
  } catch (error) {
    console.error('Erreur géocodage:', error.message);
    throw { status: 500, message: 'Erreur lors de la recherche d\'adresse' };
  }
};

// Géocodage inverse (coordonnées -> adresse)
const reverseGeocode = async (lat, lon) => {
  if (!lat || !lon) {
    throw { status: 400, message: 'Latitude et longitude sont obligatoires' };
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (latitude < -90 || latitude > 90) {
    throw { status: 400, message: 'La latitude doit être entre -90 et 90' };
  }

  if (longitude < -180 || longitude > 180) {
    throw { status: 400, message: 'La longitude doit être entre -180 et 180' };
  }

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'C15Tour/1.0'
      }
    });

    if (!response.data || response.data.error) {
      throw { status: 404, message: 'Aucune adresse trouvée pour ces coordonnées' };
    }

    return {
      address: response.data.display_name,
      latitude: parseFloat(response.data.lat),
      longitude: parseFloat(response.data.lon),
      details: response.data.address
    };
  } catch (error) {
    if (error.status) throw error;
    console.error('Erreur géocodage inverse:', error.message);
    throw { status: 500, message: 'Erreur lors du géocodage inverse' };
  }
};

export default {
  searchAddress,
  reverseGeocode
};

import geocodeService from '../services/geocodeService.js';

// Contrôleurs de géocodage : recherche d'adresse et géocodage inverse,
// utilisés notamment par l'application mobile (qui n'appelle pas directement
// les API publiques Nominatim/Photon comme le fait le frontend web).

// GET /api/geocode/search?q=...
const searchAddress = async (req, res, next) => {
  try {
    const results = await geocodeService.searchAddress(req.query.q);
    res.json(results);
  } catch (error) {
    next(error);
  }
};

// GET /api/geocode/reverse?lat=...&lon=...
const reverseGeocode = async (req, res, next) => {
  try {
    const result = await geocodeService.reverseGeocode(req.query.lat, req.query.lon);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export default {
  searchAddress,
  reverseGeocode
};

// Middleware Express centralisant la gestion des erreurs : traduit les erreurs
// personnalisées (avec un champ "status") et les codes d'erreur Prisma connus
// en réponses HTTP cohérentes, avec un repli générique en 500 pour le reste.
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erreur personnalisée avec status
  if (err.status) {
    return res.status(err.status).json({
      status: err.status,
      error: err.status === 404 ? 'Not Found' : 'Error',
      message: err.message
    });
  }

  // Erreur Prisma - Enregistrement non trouvé
  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 404,
      error: 'Not Found',
      message: 'Ressource non trouvée'
    });
  }

  // Erreur Prisma - Contrainte unique violée
  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 409,
      error: 'Conflict',
      message: 'Cette valeur existe déjà'
    });
  }

  if (err.code === 'P1001') {
    return res.status(503).json({
      status: 503,
      error: 'Database Unavailable',
      message: 'La base de donnees est inaccessible. Verifie DATABASE_URL puis redemarre le backend.'
    });
  }

  res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: 'Une erreur inattendue s\'est produite'
  });
};

export default errorHandler;

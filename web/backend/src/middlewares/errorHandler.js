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

  // Erreur par défaut
  res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: 'Une erreur inattendue s\'est produite'
  });
};

export default errorHandler;

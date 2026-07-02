import swaggerJsdoc from 'swagger-jsdoc';

// Génère la spécification OpenAPI/Swagger à partir des commentaires JSDoc
// présents dans les fichiers de routes (voir apis ci-dessous)
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Convoy Management API',
      version: '1.0.0',
      description: 'API de gestion de convois - Création, modification et suivi des convois et de leurs étapes',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

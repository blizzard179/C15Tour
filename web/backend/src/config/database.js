import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Client Prisma partagé par tous les services pour accéder à la base de données.
// On échoue immédiatement au démarrage si l'URL de connexion n'est pas configurée,
// plutôt que de laisser échouer la première requête de façon moins explicite.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Configure web/backend/.env before starting the API.');
}

const prisma = new PrismaClient();

export default prisma;

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Configure web/backend/.env before starting the API.');
}

const prisma = new PrismaClient();

export default prisma;

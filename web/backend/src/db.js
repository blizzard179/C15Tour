import pg from "pg";
import "dotenv/config";

// Pool de connexions PostgreSQL "brut" (sans ORM). Non utilisé actuellement par
// le reste du backend, qui passe par Prisma (voir config/database.js) pour tous ses accès BDD.
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

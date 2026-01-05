import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/steps
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "step" ORDER BY step_trip_id, step_order'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;

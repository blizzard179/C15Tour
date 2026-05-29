import express from "express";
import cors from "cors";
import "dotenv/config";
import tripsRouter from "./routes/tripRoutes.js";
import stepsRouter from "./routes/stepRoutes.js";

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => res.json({ message: "C15Tour API" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/trips", tripsRouter);
app.use("/api", stepsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API: http://localhost:${port}`));

setInterval(() => {}, 1000);

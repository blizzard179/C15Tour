import express from "express";
import "dotenv/config";
import tripsRouter from "./routes/trips.routes.js";
import stepsRouter from "./routes/steps.routes.js";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/trips", tripsRouter);
app.use("/api/steps", stepsRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API: http://localhost:${port}`));

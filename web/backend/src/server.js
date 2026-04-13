import express from "express";
import "dotenv/config";
import tripsRouter from "./routes/tripRoutes.js";
import stepsRouter from "./routes/stepRoutes.js";
import geocodeRouter from "./routes/geocodeRoutes.js";
import organizerRouter from "./routes/organizerRoutes.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "C15Tour API" }));
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/trips", tripsRouter);
app.use("/api", stepsRouter);
app.use("/api/geocode", geocodeRouter);
app.use("/api/organizer", organizerRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API: http://localhost:${port}`));

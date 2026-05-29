import express from "express";
import cors from "cors";
import "dotenv/config";
import tripsRouter from "./routes/tripRoutes.js";
import stepsRouter from "./routes/stepRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "C15Tour API" }));
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/trips", tripsRouter);
app.use("/api", stepsRouter);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API: http://localhost:${port}`));

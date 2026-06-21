import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import tripsRouter from "./routes/tripRoutes.js";
import stepsRouter from "./routes/stepRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";
import attachLiveAudioSignaling from "./services/liveAudioSignalingService.js";
import { createProxyMiddleware } from 'http-proxy-middleware';


const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));

app.get("/", (_req, res) => res.json({ message: "C15Tour API" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/trips", tripsRouter);
app.use("/api", stepsRouter);
app.use('/api/valhalla', createProxyMiddleware({
  target: 'https://valhalla1.openstreetmap.de',
  changeOrigin: true,
  pathRewrite: { '^/api/valhalla': '' }
}));
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = http.createServer(app);

attachLiveAudioSignaling(server);

server.listen(port, () => console.log(`API: http://localhost:${port}`));

setInterval(() => {}, 1000);

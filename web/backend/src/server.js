import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import tripsRouter from "./routes/tripRoutes.js";
import stepsRouter from "./routes/stepRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";
import attachLiveAudioSignaling from "./services/liveAudioSignalingService.js";
import { createProxyMiddleware } from 'http-proxy-middleware';


// Point d'entrée de DÉVELOPPEMENT (lancé via `npm run dev` avec nodemon, redémarre
// automatiquement à chaque modification). Ne sert pas de build frontend statique :
// en dev, le frontend tourne séparément via son propre serveur Vite. Le proxy Valhalla
// est ici délégué à http-proxy-middleware plutôt qu'implémenté à la main comme dans index.js.
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
// Reverse proxy vers le service public Valhalla (routage), pour que le frontend
// n'ait qu'à appeler /api/valhalla/* sans connaître l'URL réelle du service
app.use('/api/valhalla', createProxyMiddleware({
  target: 'https://valhalla1.openstreetmap.de',
  changeOrigin: true,
  pathRewrite: { '^/api/valhalla': '' }
}));
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = http.createServer(app);

// Ajoute le canal de signalisation WebSocket pour l'audio en direct (talkie-walkie du convoi)
attachLiveAudioSignaling(server);

server.listen(port, () => console.log(`API: http://localhost:${port}`));

// Empêche le process de se terminer même en l'absence d'activité (utile avec certains
// environnements d'hébergement/conteneurs qui arrêtent un process jugé inactif)
setInterval(() => {}, 1000);

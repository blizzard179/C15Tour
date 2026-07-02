import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import tripRoutes from './routes/tripRoutes.js';
import stepRoutes from './routes/stepRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import attachLiveAudioSignaling from './services/liveAudioSignalingService.js';

// Point d'entrée de PRODUCTION (lancé via `npm start`) : sert à la fois l'API et
// le build statique du frontend (web/C15Tour/dist), sur un seul serveur/port.
// Pour le développement, voir server.js (lancé via `npm run dev` avec nodemon).

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PATH = path.join(__dirname, '../../C15Tour/dist');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Routes
app.get('/', (_req, res) => res.json({ message: 'C15Tour API' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/trips', tripRoutes);
app.use('/api', stepRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/organizer', organizerRoutes);

// Proxy Valhalla (routing) : évite d'exposer directement l'URL du service de
// routage au client et contourne les éventuelles restrictions CORS/CSP
app.post('/api/valhalla/route', async (req, res) => {
  try {
    const response = await axios.post(
      'https://valhalla1.openstreetmap.de/route',
      req.body,
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    res.json(response.data);
  } catch {
    res.status(503).json({ error: 'Valhalla unavailable' });
  }
});

// Gestionnaire d'erreurs centralisé (doit être déclaré après toutes les routes)
app.use(errorHandler);

// Sert les fichiers statiques du build frontend, puis redirige toute route
// inconnue vers index.html pour laisser React Router gérer la navigation côté client
app.use(express.static(DIST_PATH));
app.use((_req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

const server = http.createServer(app);

// Ajoute le canal de signalisation WebSocket pour l'audio en direct (talkie-walkie du convoi)
attachLiveAudioSignaling(server);

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

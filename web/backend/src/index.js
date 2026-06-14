import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import tripRoutes from './routes/tripRoutes.js';
import stepRoutes from './routes/stepRoutes.js';
import geocodeRoutes from './routes/geocodeRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import attachLiveAudioSignaling from './services/liveAudioSignalingService.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'C15Tour API' });
});

app.use('/api/trips', tripRoutes);
app.use('/api', stepRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/organizer', organizerRoutes);

// Error handler
app.use(errorHandler);

const server = http.createServer(app);

attachLiveAudioSignaling(server);

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

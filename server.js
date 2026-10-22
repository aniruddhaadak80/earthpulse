import express from 'express';
import cors from 'cors';
import eventsHandler from './api/events.js';

const app = express();
app.use(cors());

// Mirror the Vercel serverless approach locally
app.get('/api/events', (req, res) => {
  eventsHandler(req, res);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 EarthPulse Backend running on http://localhost:${PORT}`);
});

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function fetchOutdoorWeather(): Promise<{ temperature: number; humidity: number } | null> {
  const { WEATHER_API_KEY, WEATHER_LAT, WEATHER_LON } = process.env;
  if (!WEATHER_API_KEY || !WEATHER_LAT || !WEATHER_LON) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${WEATHER_LAT}&lon=${WEATHER_LON}&appid=${WEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);
    const data = await response.json() as { main: { humidity: number; temp: number } };
    return { temperature: data.main.temp, humidity: data.main.humidity };
  } catch {
    return null;
  }
}

app.post('/api/readings', async (req: Request, res: Response) => {
  const { mac, temperature, humidity } = req.body;
  try {
    const outdoor = await fetchOutdoorWeather();
    const reading = await prisma.reading.create({
      data: {
        mac,
        temperature,
        humidity,
        outdoorTemperature: outdoor?.temperature ?? null,
        outdoorHumidity: outdoor?.humidity ?? null,
      },
    });
    res.status(201).json(reading);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reading' });
  }
});

app.get('/api/readings/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await prisma.reading.aggregate({
      _min: { temperature: true, humidity: true },
      _max: { temperature: true, humidity: true },
      _avg: { temperature: true, humidity: true },
    });
    res.json({
      temperature: {
        min: stats._min.temperature,
        max: stats._max.temperature,
        avg: stats._avg.temperature,
      },
      humidity: {
        min: stats._min.humidity,
        max: stats._max.humidity,
        avg: stats._avg.humidity,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/readings', async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;
  try {
    const readings = await prisma.reading.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(readings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

app.get('/api/weather', async (_req: Request, res: Response) => {
  const outdoor = await fetchOutdoorWeather();
  if (!outdoor) {
    res.status(503).json({ error: 'Weather not configured' });
    return;
  }
  res.json(outdoor);
});

// Serve frontend static files
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

async function backfillOutdoorWeather() {
  const outdoor = await fetchOutdoorWeather();
  if (!outdoor) return;
  const { count } = await prisma.reading.updateMany({
    where: { outdoorHumidity: null },
    data: { outdoorHumidity: outdoor.humidity, outdoorTemperature: outdoor.temperature },
  });
  if (count > 0) console.log(`Backfilled outdoor weather for ${count} readings`);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  backfillOutdoorWeather();
});

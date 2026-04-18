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
  if (!WEATHER_API_KEY || !WEATHER_LAT || !WEATHER_LON) {
    console.warn('Weather not configured: missing WEATHER_API_KEY, WEATHER_LAT, or WEATHER_LON');
    return null;
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${WEATHER_LAT}&lon=${WEATHER_LON}&appid=${WEATHER_API_KEY}&units=metric`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`OpenWeatherMap error: ${response.status} ${response.statusText}`);
    return null;
  }
  const data = await response.json() as { main?: { humidity: number; temp: number } };
  if (!data.main) {
    console.error('OpenWeatherMap unexpected response:', JSON.stringify(data));
    return null;
  }
  return { temperature: data.main.temp, humidity: data.main.humidity };
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
  console.log('Checking for readings to backfill...');
  const nullCount = await prisma.reading.count({ where: { outdoorHumidity: null } });
  if (nullCount === 0) {
    console.log('No readings need backfilling');
    return;
  }
  console.log(`Found ${nullCount} readings without outdoor data, fetching weather...`);
  const outdoor = await fetchOutdoorWeather();
  if (!outdoor) {
    console.error('Backfill aborted: could not fetch outdoor weather');
    return;
  }
  const { count } = await prisma.reading.updateMany({
    where: { outdoorHumidity: null },
    data: { outdoorHumidity: outdoor.humidity, outdoorTemperature: outdoor.temperature },
  });
  console.log(`Backfilled outdoor weather for ${count} readings`);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  backfillOutdoorWeather();
});

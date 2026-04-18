import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/readings', async (req: Request, res: Response) => {
  const { mac, temperature, humidity } = req.body;
  try {
    const reading = await prisma.reading.create({
      data: { mac, temperature, humidity },
    });
    res.status(201).json(reading);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reading' });
  }
});

app.get('/readings/stats', async (_req: Request, res: Response) => {
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

app.get('/readings', async (req: Request, res: Response) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

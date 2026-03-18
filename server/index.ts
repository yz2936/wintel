import express from 'express';
import dotenv from 'dotenv';
import { handleApiRequest } from './api';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 3001);

app.use(express.json({ limit: '2mb' }));
app.use('/api', async (req, res) => {
  const result = await handleApiRequest({
    method: req.method,
    path: req.originalUrl,
    headers: req.headers as Record<string, string | string[] | undefined>,
    body: req.body
  });

  if (result.status === 204) {
    res.status(204).end();
    return;
  }

  res.status(result.status).json(result.body ?? {});
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

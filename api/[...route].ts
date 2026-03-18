import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from '../server/api';

export default async function handler(req: IncomingMessage & { body?: any; url?: string }, res: ServerResponse) {
  const body = req.body ?? await readJsonBody(req);
  const result = await handleApiRequest({
    method: req.method,
    path: req.url || '/api',
    headers: req.headers,
    body
  });

  res.statusCode = result.status;
  if (result.status === 204) {
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result.body ?? {}));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

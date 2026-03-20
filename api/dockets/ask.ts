import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  try {
    const { answerDocketQuestion, requireUser } = await import('./_shared.js');

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const user = await requireUser(req.headers);
    const body = await readJsonBody(req);
    const result = await answerDocketQuestion(
      user.id,
      typeof body?.question === 'string' ? body.question : '',
      body?.state === 'MA' ? 'MA' : 'NY',
      body?.utilityType === 'gas' || body?.utilityType === 'electric' ? body.utilityType : 'all'
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled docket ask failure';
    res.statusCode = message === 'UNAUTHORIZED' ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message === 'UNAUTHORIZED' ? 'Unauthorized' : message }));
  }
}

async function readJsonBody(req: IncomingMessage & { body?: any }) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body ? JSON.parse(req.body) : undefined;
    }

    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString('utf8');
      return raw ? JSON.parse(raw) : undefined;
    }

    return req.body;
  }

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

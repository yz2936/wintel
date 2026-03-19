import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { body?: any; url?: string }, res: ServerResponse) {
  try {
    const { fetchFocusSummary, requireUser } = await import('./_shared.js');
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    await requireUser(req.headers);
    const body = await readJsonBody(req);
    const text = await fetchFocusSummary({
      companyName: body?.companyName,
      opcos: Array.isArray(body?.opcos) ? body.opcos : [],
      functions: Array.isArray(body?.functions) ? body.functions : [],
      selectedYear: typeof body?.selectedYear === 'number' ? body.selectedYear : null,
      userProfile: typeof body?.userProfile === 'string' ? body.userProfile : '',
      lastUserPrompt: typeof body?.lastUserPrompt === 'string' ? body.lastUserPrompt : '',
      lastAssistantSummary: typeof body?.lastAssistantSummary === 'string' ? body.lastAssistantSummary : ''
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ text }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled AI focus summary route failure';
    console.error(`AI focus summary route failed: ${message}`);
    res.statusCode = message === 'UNAUTHORIZED' ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message === 'UNAUTHORIZED' ? 'Unauthorized' : message }));
  }
}

async function readJsonBody(req: IncomingMessage & { body?: any }) {
  if (req.body !== undefined) {
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

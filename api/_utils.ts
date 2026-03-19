import type { IncomingMessage, ServerResponse } from 'node:http';

export async function handleWithPath(
  req: IncomingMessage & { body?: any; url?: string },
  res: ServerResponse,
  path: string
) {
  try {
    const { handleApiRequest } = await import('../server/api.js');
    const body = req.body ?? await readJsonBody(req);
    const result = await handleApiRequest({
      method: req.method,
      path,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled API failure';
    console.error(`API route failed for ${path}: ${message}`);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
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

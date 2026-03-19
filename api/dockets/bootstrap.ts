import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const { bootstrapDefaultWatchlist, requireUser } = await import('./_shared.js');

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const user = await requireUser(req.headers);
    const result = await bootstrapDefaultWatchlist(user);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled docket bootstrap failure';
    res.statusCode = message === 'UNAUTHORIZED' ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message === 'UNAUTHORIZED' ? 'Unauthorized' : message }));
  }
}

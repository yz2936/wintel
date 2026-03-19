import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const { listRecentEventsForUser, requireUser } = await import('./_shared.js');

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const user = await requireUser(req.headers);
    const result = await listRecentEventsForUser(user.id);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled docket events failure';
    res.statusCode = message === 'UNAUTHORIZED' ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message === 'UNAUTHORIZED' ? 'Unauthorized' : message }));
  }
}

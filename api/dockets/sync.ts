import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  try {
    const { requireUser, syncDocketWatches } = await import('./_shared.js');

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const url = new URL(req.url || '/api/dockets/sync', 'https://wintel.local');
    const forceSend = url.searchParams.get('force') === 'true';
    const authMode = getSyncAuthMode(req);
    if (authMode === 'unauthorized') {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const user = authMode === 'user' ? await requireUser(req.headers) : null;
    const result = await syncDocketWatches({ forceSend, userId: user?.id });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unhandled docket sync failure';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

function getSyncAuthMode(req: IncomingMessage & { url?: string }) {
  if (req.headers['x-vercel-cron']) {
    return 'admin';
  }

  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  const syncSecret = process.env.DOCKET_SYNC_SECRET || '';
  if (syncSecret && authorization === `Bearer ${syncSecret}`) {
    return 'admin';
  }

  const url = new URL(req.url || '/api/dockets/sync', 'https://wintel.local');
  if (syncSecret && url.searchParams.get('secret') === syncSecret) {
    return 'admin';
  }

  if (authorization?.startsWith('Bearer ')) {
    return 'user';
  }

  return 'unauthorized';
}

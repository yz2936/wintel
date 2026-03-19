import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage & { url?: string }, res: ServerResponse) {
  try {
    const { syncDocketWatches } = await import('./_shared.js');

    if (req.method !== 'GET' && req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    if (!isAuthorizedSyncRequest(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const url = new URL(req.url || '/api/dockets/sync', 'https://wintel.local');
    const forceSend = url.searchParams.get('force') === 'true';
    const result = await syncDocketWatches({ forceSend });

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

function isAuthorizedSyncRequest(req: IncomingMessage & { url?: string }) {
  if (req.headers['x-vercel-cron']) {
    return true;
  }

  const syncSecret = process.env.DOCKET_SYNC_SECRET || '';
  if (!syncSecret) {
    return false;
  }

  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  if (authorization === `Bearer ${syncSecret}`) {
    return true;
  }

  const url = new URL(req.url || '/api/dockets/sync', 'https://wintel.local');
  return url.searchParams.get('secret') === syncSecret;
}

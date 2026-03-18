import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleWithPath } from '../_utils';

export default async function handler(req: IncomingMessage & { body?: any; url?: string }, res: ServerResponse) {
  await handleWithPath(req, res, '/api/ai/timeline');
}

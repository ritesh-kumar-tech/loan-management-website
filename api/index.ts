import { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server';

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp({ serveClient: false });
  }

  const app = await appPromise;
  return app(req, res);
}

import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import routes from './routes.ts';
import { getPoller } from './live/poller.ts';
import { getPreferences } from './preferences.ts';
import { getProvider } from './providers/index.ts';

const app = express();
app.use(express.json());
app.use('/api', routes);

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../dist/client');

// In production the built SPA is served from the same origin as the API, so
// there is no CORS surface and the SSE stream shares the connection pool.
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  const provider = getProvider();
  const prefs = getPreferences();
  console.log(`Courtside API on :${port}`);
  console.log(`  provider   ${provider.name}${provider.name === 'mock' ? ' (fixture data — every screen is labelled)' : ''}`);
  console.log(`  timezone   ${prefs.timezone}`);
  console.log(`  tracking   ${prefs.trackedTeamIds.length} teams`);

  if (process.env.ENABLE_POLLER === 'true') {
    getPoller().start();
    console.log('  poller     started');
  } else {
    console.log('  poller     disabled (set ENABLE_POLLER=true)');
  }
});

const shutdown = () => {
  getPoller().stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

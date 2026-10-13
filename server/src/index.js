import app from './app.js';
import { config } from './config/env.js';

import { initExpireResourcesCron } from './cron/expireResources.js';

const server = app.listen(config.port, () => {
  console.log(`[NGOConnect AI] Server running on port ${config.port} (${config.nodeEnv})`);
  initExpireResourcesCron();
});

// Graceful process shutdown
process.on('SIGTERM', () => {
  console.log('[NGOConnect AI] SIGTERM signal received. Closing HTTP server.');
  server.close(() => {
    console.log('[NGOConnect AI] HTTP server closed.');
  });
});

import fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';

import { buildConfig } from './modules/config.js';
import { registerCoreRoutes } from './routes/core.route.js';
import { registerHealthRoute } from './routes/health.route.js';
import { registerMatchingRoutes } from './routes/matching.route.js';
import { registerPaymentRoutes } from './routes/payments.route.js';

const config = buildConfig();

async function bootstrap() {
  const app = fastify({
    logger: {
      level: config.logLevel
    }
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true
  });

  await app.register(websocket);

  registerCoreRoutes(app);
  registerHealthRoute(app);
  registerMatchingRoutes(app);
  registerPaymentRoutes(app);

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`SuperMock API listening on ${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap SuperMock API', error);
  process.exit(1);
});

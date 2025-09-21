import fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';

import { buildConfig } from './modules/config.js';
import authPlugin from './plugins/auth.plugin.js';
import rateLimitPlugin from './plugins/rate-limit.plugin.js';
import { registerCoreRoutes } from './routes/core.route.js';
import { registerHealthRoute } from './routes/health.route.js';
import { registerMatchingRoutes } from './routes/matching.route.js';
import { registerPaymentRoutes } from './routes/payments.route.js';
import { registerAuthRoutes } from './routes/auth.route.js';
import { registerUserRoutes } from './routes/users.route.js';
import { registerCandidateRoutes } from './routes/candidates.route.js';
import { registerInterviewerRoutes } from './routes/interviewers.route.js';
import { registerOnboardingRoutes } from './routes/onboarding.route.js';
import { registerInvitationRoutes } from './routes/invitations.route.js';
import { registerAvatarRoutes } from './routes/avatar.route.js';
import { registerRealtimeSessionRoutes } from './routes/sessions.route.js';
import { registerNotificationRoutes } from './routes/notifications.route.js';
import { registerAnalyticsRoutes } from './routes/analytics.route.js';
import { registerRealtimeWebsocketRoutes } from './routes/realtime.ws.js';
import { DailyCoService } from './modules/daily-co.js';

const config = buildConfig();
const dailyCoService = config.dailyCo.enabled
  ? new DailyCoService({ apiKey: config.dailyCo.apiKey, domain: config.dailyCo.domain })
  : null;

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

  await app.register(rateLimitPlugin, { config });
  await app.register(websocket);
  await app.register(authPlugin, { config });

  registerCoreRoutes(app);
  registerHealthRoute(app);
  registerMatchingRoutes(app, {
    dailyCo: {
      service: dailyCoService,
      domain: config.dailyCo.domain,
      enabled: config.dailyCo.enabled
    }
  });
  registerPaymentRoutes(app);
  registerAuthRoutes(app, config);
  registerUserRoutes(app, { passwordSaltRounds: config.password.saltRounds });
  registerCandidateRoutes(app);
  registerInterviewerRoutes(app);
  registerOnboardingRoutes(app);
  registerInvitationRoutes(app);
  registerAvatarRoutes(app);
  registerRealtimeSessionRoutes(app);
  registerNotificationRoutes(app);
  registerAnalyticsRoutes(app);
  registerRealtimeWebsocketRoutes(app);

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

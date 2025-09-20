import type { FastifyInstance } from 'fastify';

export function registerCoreRoutes(app: FastifyInstance) {
  app.get('/', async () => ({
    name: 'SuperMock API',
    version: '0.1.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      matching: 'ready',
      realtime: 'planned',
      analytics: 'planned'
    }
  }));
}

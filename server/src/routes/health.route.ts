import type { FastifyInstance } from 'fastify';

export function registerHealthRoute(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
}

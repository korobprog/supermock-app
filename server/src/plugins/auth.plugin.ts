import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import jwt from '@fastify/jwt';
import { UserRole } from '@prisma/client';

import type { AppConfig } from '../modules/config.js';
import { authenticate, authorizeRoles } from '../utils/auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorizeRoles: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      role: UserRole;
      emailVerified: boolean;
    };
  }
}

const authPlugin: FastifyPluginAsync<{ config: AppConfig }> = async (app, opts) => {
  await app.register(jwt, {
    secret: opts.config.jwt.secret,
    sign: {
      expiresIn: opts.config.jwt.accessTokenTtl
    }
  });

  app.decorate('authenticate', authenticate);
  app.decorate('authorizeRoles', authorizeRoles);
};

function exposePlugin<T extends Record<string, any>>(fn: FastifyPluginAsync<T>, name: string): FastifyPluginAsync<T> {
  const plugin = fn as FastifyPluginAsync<T> & {
    default?: FastifyPluginAsync<T>;
    [key: symbol]: unknown;
  };

  plugin[Symbol.for('skip-override')] = true;
  plugin[Symbol.for('fastify.display-name')] = name;
  plugin[Symbol.for('plugin-meta')] = { name };
  plugin.default = plugin;

  return plugin;
}

export default exposePlugin(authPlugin, 'auth-plugin');

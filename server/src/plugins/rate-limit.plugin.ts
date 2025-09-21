import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';

import type { AppConfig } from '../modules/config.js';
import { getRequestIp } from '../utils/request-ip.js';

declare module 'fastify' {
  interface FastifyRouteConfig {
    rateLimit?: {
      max: number;
      timeWindow: string;
    } | false;
  }
}

const rateLimitPlugin: FastifyPluginAsync<{ config: AppConfig }> = async (app, opts) => {
  const { global, critical } = opts.config.rateLimit;

  app.addHook('onRoute', (routeOptions) => {
    if (typeof routeOptions.url !== 'string') {
      return;
    }

    if (routeOptions.config?.rateLimit === false) {
      return;
    }

    if (!routeOptions.url.startsWith('/auth') && !routeOptions.url.startsWith('/matching')) {
      return;
    }

    if (routeOptions.config?.rateLimit) {
      return;
    }

    routeOptions.config = {
      ...(routeOptions.config ?? {}),
      rateLimit: {
        max: critical.max,
        timeWindow: critical.timeWindow
      }
    };
  });

  await app.register(rateLimit, {
    global: true,
    max: global.max,
    timeWindow: global.timeWindow,
    keyGenerator: (request) => getRequestIp(request)
  });
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

export default exposePlugin(rateLimitPlugin, 'rate-limit-plugin');

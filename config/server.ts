import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Railway terminates TLS and forwards X-Forwarded-Proto / X-Forwarded-For.
  // Trusting the proxy gives Secure admin cookies and per-client rate limiting.
  proxy: { koa: env.bool('TRUST_PROXY', true) },
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;

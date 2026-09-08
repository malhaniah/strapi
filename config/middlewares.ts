import type { Core } from '@strapi/strapi';

/**
 * Origins allowed to call the API from a browser.
 *
 * Read from CORS_ORIGINS as a comma-separated list. Each entry is either an
 * exact origin ("https://mohammed.example") or a wildcard-subdomain pattern
 * ("https://*.vercel.app") so Vercel preview deployments work without listing
 * every generated hostname.
 */
const buildOriginMatcher = (patterns: string[]) => {
  const exact = new Set<string>();
  const wildcards: RegExp[] = [];

  for (const raw of patterns) {
    const pattern = raw.trim();
    if (!pattern) continue;
    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+');
      wildcards.push(new RegExp(`^${escaped}$`, 'i'));
    } else {
      exact.add(pattern);
    }
  }

  return (origin: string): boolean =>
    exact.has(origin) || wildcards.some((re) => re.test(origin));
};

/** Hosts the admin panel is allowed to load media previews from. */
const MEDIA_HOSTS = ['res.cloudinary.com'];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const isAllowedOrigin = buildOriginMatcher(
    env.array('CORS_ORIGINS', ['http://localhost:3000'])
  );

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': ["'self'", 'data:', 'blob:', 'https://market-assets.strapi.io', ...MEDIA_HOSTS],
            'media-src': ["'self'", 'data:', 'blob:', 'https://market-assets.strapi.io', ...MEDIA_HOSTS],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        // strapi::cors calls this per request and then does an exact match
        // against the returned list, so we return the request origin only
        // when it passes our matcher.
        origin: (ctx: { get: (header: string) => string }) => {
          const requestOrigin = ctx.get('Origin');
          return requestOrigin && isAllowedOrigin(requestOrigin) ? [requestOrigin] : [];
        },
        methods: ['GET', 'HEAD', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        credentials: false,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;

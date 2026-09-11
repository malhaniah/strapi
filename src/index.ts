import type { Core } from '@strapi/strapi';

/**
 * Locales the site ships with. Arabic is the default locale (see CLAUDE.md);
 * English is secondary. Locales are database state, so we make sure they exist
 * on every boot instead of relying on someone clicking through the admin.
 */
const LOCALES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'ar', name: 'Arabic (ar)' },
  { code: 'en', name: 'English (en)' },
];
const DEFAULT_LOCALE = 'ar';

/**
 * The complete set of actions the Public role may call. Anything else found on
 * the Public role is removed, including Strapi's default users-permissions auth
 * endpoints (register, callback, etc.) which this site does not use.
 *
 * Single types expose `find` only; there is no `findOne` on a single type.
 */
const PUBLIC_ACTIONS: ReadonlyArray<string> = [
  'api::case-study.case-study.find',
  'api::case-study.case-study.findOne',
  'api::experience.experience.find',
  'api::experience.experience.findOne',
  'api::global.global.find',
  'api::home.home.find',
];

/**
 * Next.js on-demand revalidation webhook.
 *
 * Webhooks are database state, exactly like permissions, so we own one webhook
 * named `next-revalidate` and reconcile it from env on every boot:
 *   REVALIDATE_WEBHOOK_URL     e.g. https://your-site.com/api/revalidate
 *   REVALIDATE_WEBHOOK_SECRET  shared secret, sent as `Authorization: Bearer <secret>`
 * With the URL unset the webhook is left exactly as it is. This matters when
 * `npm run seed` runs from a laptop against the Railway database: the seed
 * boots this bootstrap with local env, and it must not touch production state.
 *
 * `entry.update` is included because single types (global, home) have no
 * publish step. The Next.js handler ignores `entry.update` for draft entries
 * (publishedAt === null), so draft saves on case studies do not revalidate.
 */
const REVALIDATE_WEBHOOK_NAME = 'next-revalidate';
const REVALIDATE_WEBHOOK_EVENTS: ReadonlyArray<string> = [
  'entry.publish',
  'entry.unpublish',
  'entry.delete',
  'entry.update',
  'media.update',
  'media.delete',
];

type Webhook = {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  isEnabled: boolean;
};
type WebhookStore = {
  findWebhooks(): Promise<Webhook[]>;
  createWebhook(data: Omit<Webhook, 'id'>): Promise<Webhook>;
  updateWebhook(id: string, data: Omit<Webhook, 'id'>): Promise<Webhook | null>;
};
type WebhookRunner = {
  add(webhook: Webhook): void;
  update(webhook: Webhook): void;
};

const ensureRevalidationWebhook = async (strapi: Core.Strapi) => {
  const url = process.env.REVALIDATE_WEBHOOK_URL?.trim();
  const secret = process.env.REVALIDATE_WEBHOOK_SECRET?.trim();
  const store = strapi.get('webhookStore') as unknown as WebhookStore;
  const runner = strapi.get('webhookRunner') as unknown as WebhookRunner;

  if (!url) {
    return;
  }

  const existing = (await store.findWebhooks()).find((w) => w.name === REVALIDATE_WEBHOOK_NAME);

  if (!secret) {
    throw new Error('REVALIDATE_WEBHOOK_URL is set but REVALIDATE_WEBHOOK_SECRET is missing');
  }

  const desired: Omit<Webhook, 'id'> = {
    name: REVALIDATE_WEBHOOK_NAME,
    url,
    headers: { Authorization: `Bearer ${secret}` },
    events: [...REVALIDATE_WEBHOOK_EVENTS],
    isEnabled: true,
  };

  if (!existing) {
    const created = await store.createWebhook(desired);
    runner.add(created);
    strapi.log.info(`[bootstrap] created webhook "${REVALIDATE_WEBHOOK_NAME}" -> ${url}`);
    return;
  }

  const unchanged =
    existing.url === desired.url &&
    existing.isEnabled === true &&
    JSON.stringify(existing.headers ?? {}) === JSON.stringify(desired.headers) &&
    JSON.stringify([...(existing.events ?? [])].sort()) === JSON.stringify([...desired.events].sort());

  if (!unchanged) {
    const updated = await store.updateWebhook(existing.id, desired);
    if (updated) runner.update(updated);
    strapi.log.info(`[bootstrap] updated webhook "${REVALIDATE_WEBHOOK_NAME}" -> ${url}`);
  }
};

const ensureLocales = async (strapi: Core.Strapi) => {
  const locales = strapi.plugin('i18n').service('locales');

  for (const locale of LOCALES) {
    const existing = await locales.findByCode(locale.code);
    if (!existing) {
      await locales.create(locale);
      strapi.log.info(`[bootstrap] created locale ${locale.code}`);
    }
  }

  const currentDefault = await locales.getDefaultLocale();
  if (currentDefault !== DEFAULT_LOCALE) {
    await locales.setDefaultLocale({ code: DEFAULT_LOCALE });
    strapi.log.info(`[bootstrap] default locale set to ${DEFAULT_LOCALE} (was ${currentDefault ?? 'unset'})`);
  }
};

const syncPublicPermissions = async (strapi: Core.Strapi) => {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');

  const publicRole = await roleQuery.findOne({ where: { type: 'public' } });
  if (!publicRole) {
    strapi.log.warn('[bootstrap] Public role not found; skipping permission sync');
    return;
  }

  const existing: Array<{ id: number; action: string }> = await permissionQuery.findMany({
    where: { role: { id: publicRole.id } },
  });
  const existingActions = new Set(existing.map((p) => p.action));
  const allowed = new Set(PUBLIC_ACTIONS);

  const toRemove = existing.filter((p) => !allowed.has(p.action));
  for (const permission of toRemove) {
    await permissionQuery.delete({ where: { id: permission.id } });
  }

  const toAdd = PUBLIC_ACTIONS.filter((action) => !existingActions.has(action));
  for (const action of toAdd) {
    await permissionQuery.create({ data: { action, role: publicRole.id } });
  }

  if (toRemove.length > 0 || toAdd.length > 0) {
    strapi.log.info(
      `[bootstrap] Public role permissions synced: +${toAdd.length} -${toRemove.length}` +
        (toRemove.length > 0 ? ` (removed: ${toRemove.map((p) => p.action).join(', ')})` : '')
    );
  }
};

/**
 * Database sanity checks. These run in `register`, which executes at runtime
 * before Strapi opens a connection and is never called by `strapi build`, so a
 * build can succeed without any database variables while a misconfigured
 * container still fails with a message naming the missing variable instead
 * of an opaque "AggregateError".
 */
const assertDatabaseConfig = (strapi: Core.Strapi) => {
  const client = strapi.config.get('database.connection.client') as string;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && client === 'sqlite') {
    throw new Error(
      'DATABASE_CLIENT is "sqlite" (or unset) while NODE_ENV=production. SQLite lives on the container disk, ' +
        'which Railway wipes on every redeploy. Set DATABASE_CLIENT=postgres and DATABASE_URL.'
    );
  }

  if (client === 'postgres' && !process.env.DATABASE_URL && !process.env.DATABASE_HOST) {
    throw new Error(
      'DATABASE_CLIENT=postgres but neither DATABASE_URL nor DATABASE_HOST is set, so the driver would try localhost:5432. ' +
        'On Railway, add DATABASE_URL as a reference to the Postgres service, e.g. ${{Postgres.DATABASE_URL}}, ' +
        'and confirm it resolves to a postgresql:// URL in the Variables tab.'
    );
  }
};

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    assertDatabaseConfig(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureLocales(strapi);
    await syncPublicPermissions(strapi);
    await ensureRevalidationWebhook(strapi);
  },
};

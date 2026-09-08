/**
 * Strapi -> Next.js on-demand revalidation endpoint.
 *
 * Drop this file into your Next.js app at:  app/api/revalidate/route.ts
 * Requires Next.js 15+ (App Router, `after` from next/server).
 *
 * Env on Vercel:
 *   REVALIDATE_SECRET       must equal Strapi's REVALIDATE_WEBHOOK_SECRET
 *   NEXT_PUBLIC_SITE_URL    optional, e.g. https://your-domain.com; enables
 *                           warm-up fetches so pages are rebuilt immediately
 *                           instead of on the next visitor.
 *
 * What Strapi sends is documented in docs/revalidation.md in the Strapi repo.
 */
import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after, NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs'; // timingSafeEqual needs the Node runtime
export const dynamic = 'force-dynamic';

const LOCALES = ['ar', 'en'] as const;
const DEFAULT_LOCALE = 'ar';

type StrapiEntry = {
  documentId: string;
  locale?: string;
  slug?: string;
  publishedAt?: string | null;
};

type StrapiWebhookPayload = {
  event: string;
  createdAt: string;
  model?: string; // e.g. "case-study"
  uid?: string; // e.g. "api::case-study.case-study"
  entry?: StrapiEntry;
  media?: { id: number; documentId?: string; url?: string };
};

/**
 * Pages each model renders into, relative to the locale prefix.
 * ADJUST THESE to your actual route structure.
 */
const ROUTES: Record<string, (entry: StrapiEntry) => string[]> = {
  'api::home.home': () => ['/'],
  'api::experience.experience': () => ['/about'],
  'api::case-study.case-study': (e) => ['/', '/work', ...(e.slug ? [`/work/${e.slug}`] : [])],
  // global feeds the layout (nav labels, contact, CV); handled as a layout-wide revalidation
  'api::global.global': () => [],
};
const LAYOUT_WIDE = new Set(['api::global.global']);
/** Pages to warm after a layout-wide or media revalidation. */
const WARM_PATHS = ['/', '/work', '/about'];

const localePath = (locale: string, path: string) => (path === '/' ? `/${locale}` : `/${locale}${path}`);

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.REVALIDATE_SECRET ?? '';
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: StrapiWebhookPayload;
  try {
    payload = (await req.json()) as StrapiWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const { event } = payload;
  const pagePaths = new Set<string>();
  const layoutPaths = new Set<string>();
  const tags = new Set<string>();
  const warm = new Set<string>();

  // The "Trigger" button in Strapi's webhook settings sends this. Answer 200 so
  // the admin shows success, but revalidate nothing.
  if (event === 'trigger-test') {
    return NextResponse.json({ ok: true, ignored: event });
  }

  if (event.startsWith('media.')) {
    // A replaced or deleted file can appear on any page: invalidate every locale tree.
    for (const locale of LOCALES) {
      layoutPaths.add(`/${locale}`);
      for (const p of WARM_PATHS) warm.add(localePath(locale, p));
    }
    tags.add('strapi:media');
  } else {
    const { uid, entry } = payload;
    if (!uid || !entry) {
      return NextResponse.json({ ok: true, ignored: 'no entry in payload' });
    }
    // Draft saves on draft & publish types arrive as entry.update with publishedAt null.
    if (event === 'entry.update' && !entry.publishedAt) {
      return NextResponse.json({ ok: true, ignored: 'draft save' });
    }
    const build = ROUTES[uid];
    if (!build) {
      return NextResponse.json({ ok: true, ignored: `unknown model ${uid}` });
    }

    const model = uid.split('.').pop() as string; // "case-study"
    const locale = entry.locale ?? DEFAULT_LOCALE;

    tags.add(`strapi:${model}`);
    tags.add(`strapi:${model}:${locale}`);
    if (entry.slug) tags.add(`strapi:${model}:${locale}:${entry.slug}`);

    if (LAYOUT_WIDE.has(uid)) {
      layoutPaths.add(`/${locale}`);
      for (const p of WARM_PATHS) warm.add(localePath(locale, p));
    } else {
      for (const p of build(entry)) {
        const full = localePath(locale, p);
        pagePaths.add(full);
        warm.add(full);
      }
    }
  }

  // Next.js 16 deprecates the one-argument form: use revalidateTag(tag, 'max').
  for (const tag of tags) revalidateTag(tag);
  for (const p of pagePaths) revalidatePath(p);
  for (const p of layoutPaths) revalidatePath(p, 'layout');

  // Rebuild now instead of on the next visitor. Runs after the response is sent,
  // so Strapi's 10 s webhook timeout is never at risk.
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (site && warm.size > 0) {
    after(async () => {
      await Promise.allSettled(
        [...warm].map((p) => fetch(`${site}${p}`, { cache: 'no-store', headers: { 'x-revalidate-warm': '1' } }))
      );
    });
  }

  return NextResponse.json({
    revalidated: true,
    event,
    uid: payload.uid ?? null,
    locale: payload.entry?.locale ?? null,
    paths: [...pagePaths, ...layoutPaths],
    tags: [...tags],
    warmed: site ? [...warm] : [],
  });
}

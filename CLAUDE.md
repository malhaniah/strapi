# Portfolio CMS — Project Rules

Strapi 5 backend for a bilingual (Arabic/English) portfolio site.
Deployed on Railway with Postgres. Consumed by a Next.js frontend on Vercel.

## Localization

- The i18n plugin is enabled. Arabic (`ar`) is the DEFAULT locale.
  English (`en`) is secondary.
- Localized fields: all human-readable text — titles, summaries, body copy,
  bullets, labels.
- NOT localized: `slug`, media, `order`, `year`, dates, external URLs, booleans.
  A slug that varies by locale breaks frontend routing.

## Conventions

- Content types are defined in code as `schema.json` files, committed to the
  repo — not clicked together in the admin UI. The repo is the source of truth.
- Reusable field groups live in `src/components/`.
- Every collection type has an `order` integer for manual sorting.
- Draft & Publish is on for content types, off for single types.

## Security

- Never commit secrets. All keys come from environment variables.
- API tokens issued for the frontend are READ-ONLY.
- The Public role gets `find` and `findOne` only — never `create`, `update`,
  or `delete`.

## Deployment reality

- Railway containers have an ephemeral filesystem. Anything written to
  `public/uploads` is destroyed on redeploy. Media MUST go to an external
  provider or a mounted volume.
- Strapi's auth secrets must be fixed environment variables. If they
  regenerate, admin logins and issued API tokens all break.
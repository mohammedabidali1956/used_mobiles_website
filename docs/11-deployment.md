# docs/12-DEPLOYMENT-MODEL.md

# Deployment Model

---

## Infrastructure Overview
Developer's Machine (dev only, never serves production)
│
▼
GitHub Repository (main branch = production source)
│
▼
Vercel (automated deploy on push to main)
│
├─── Next.js App (serverless functions + static assets)
│         │
│         └─── Connects to Neon PostgreSQL
│
└─── Vercel CDN Edge Network (caches public pages globally)

External Services (always online, not developer-dependent):
- Neon PostgreSQL (production database with automated backups)
- Cloudinary (image storage and CDN)
- Sentry (error monitoring)

**Critical operational fact:** Once deployed to Vercel + Neon, the application
runs entirely in the cloud. Turning off the developer's laptop has zero impact
on production availability.

---

## Required Environment Variables

Set these in the Vercel project dashboard under "Environment Variables"
(use separate values per environment: Production, Preview, Development).

```bash
# Database
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/mobilex?sslmode=require&pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/mobilex?sslmode=require"
# (DIRECT_DATABASE_URL is used by Prisma migrate; DATABASE_URL uses the pooler)

# Authentication
NEXTAUTH_SECRET="<64-char random string — generate with: openssl rand -base64 64>"
NEXTAUTH_URL="https://yourdomain.com"
# (For Preview deployments, NEXTAUTH_URL is set to the Vercel preview URL)

# Cloudinary
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
# (NEXT_PUBLIC_ prefix exposes it to client-side for Cloudinary Upload Widget)

# Error Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
```

---

## Deployment Pipeline

### Development Workflow
1. Developer creates feature branch from main
2. Code locally against Neon dev branch database
3. Push branch to GitHub → Vercel creates Preview deployment (auto)
4. Test Preview deployment (uses Preview env vars)
5. Create pull request → review
6. Merge to main → Vercel triggers production deployment (auto)
7. Production deploy runs: build → test → deploy
8. Prisma migrations must be run separately (see below)

### Prisma Migration Strategy

Prisma migrations are NOT run automatically on Vercel deploy (too risky).

**Migration process:**
```bash
# 1. On local machine, modify prisma/schema.prisma
# 2. Generate and apply migration to dev DB:
npx prisma migrate dev --name "descriptive_name"

# 3. Review the generated SQL in prisma/migrations/xxx/migration.sql

# 4. Commit the migration files to git

# 5. When deploying to production, run migration against production DB:
#    (Use a GitHub Action that runs before Vercel deploys, or manually:)
npx prisma migrate deploy
# (This only runs pending migrations; safe to run multiple times)
```

A GitHub Action can run `prisma migrate deploy` automatically before each
production deploy by adding it as a build step, using `DATABASE_URL` set as
a GitHub Secret (not Vercel Secret) pointing to production DB.

### Build Command (Vercel)
`prisma generate && next build`
`prisma generate` regenerates the Prisma Client from the schema before build.

### Initial Seed (One-Time, During First Deploy)
```bash
# Run once after first migration to create SUPER_ADMIN and system_config
npx prisma db seed
```
The seed script is in `prisma/seed.ts`. It creates:
- One SUPER_ADMIN user (credentials provided via env vars during seed)
- Default system_config entries

After seeding, the SUPER_ADMIN user logs in and changes their password.

---

## Domain and DNS Configuration

1. Purchase/own domain from a registrar (Namecheap, GoDaddy, Cloudflare).
2. In Vercel project settings → Domains → Add the domain.
3. Vercel provides DNS records (A record or CNAME).
4. Set those records in the registrar's DNS management panel.
5. Vercel automatically provisions SSL certificate (Let's Encrypt) within minutes.
6. Set `NEXTAUTH_URL` to `https://yourdomain.com` in Vercel production env vars.

---

## Database Hosting (Neon)

### Setup
1. Create a Neon account at neon.tech.
2. Create a project named "mobilex".
3. Neon creates a main branch (use for production) and allows you to create
   development branches.
4. Copy the connection strings from the Neon dashboard.
5. Use the pooled connection string for `DATABASE_URL`.
6. Use the direct connection string for `DIRECT_DATABASE_URL`.

### Backups
Neon provides point-in-time restore (PITR) by default:
- Free tier: 7-day PITR.
- Pro tier: 30-day PITR.

For additional safety, add a weekly `pg_dump` backup to an S3 bucket or
Google Drive via a GitHub Action:
```yaml
# .github/workflows/backup.yml
# Runs weekly on Sunday 2am UTC
# Exports pg_dump and uploads to a private S3 bucket
```

---

## Monitoring and Alerting

### Error Tracking (Sentry)
- Install `@sentry/nextjs`. Configured in `sentry.client.config.ts` and
  `sentry.server.config.ts`.
- All unhandled exceptions in API routes are captured.
- Source maps uploaded on build for readable stack traces.
- Alert channel: email to SUPER_ADMIN when a new error type appears.

### Uptime Monitoring
- Use a free uptime monitor (UptimeRobot or BetterUptime).
- Monitor the production URL with a 1-minute check interval.
- Alert via email/SMS if the site goes down.

### Vercel Analytics
- Enable in Vercel project settings.
- Tracks Core Web Vitals per page.
- Zero configuration; built into Vercel.

---

## Deployment Checklist (Before Go-Live)

- [ ] All environment variables set in Vercel production environment.
- [ ] Domain connected and SSL active.
- [ ] `prisma migrate deploy` run against production database.
- [ ] `prisma db seed` run (one time only).
- [ ] SUPER_ADMIN password changed after first login.
- [ ] Sentry DSN confirmed working (trigger a test error).
- [ ] Uptime monitor configured.
- [ ] At least 3 products created and verified visible on public site.
- [ ] A test bill created through the billing panel end-to-end.
- [ ] Stock verified decremented after test bill.
- [ ] Product visibility toggle verified (unlist/relist).
- [ ] All admin CRUD operations tested.
- [ ] Mobile responsiveness verified on an actual device.
- [ ] Page load speed verified with PageSpeed Insights (target: 90+ score).
- [ ] robots.txt and sitemap.xml accessible.


# docs/11-PERFORMANCE-MODEL.md

# Performance Model

---

## Frontend Performance

### Next.js Rendering Decisions
Public pages use Incremental Static Regeneration (ISR). Pages are generated
at build time or on first request, then cached at Vercel's edge CDN.
The revalidation timer means a change goes live within the configured window
without a full rebuild.

On-demand revalidation via `revalidatePath()` is called from admin API routes
when products, categories, or brands are updated. This purges the relevant
CDN cache entries immediately.

### Image Optimization
- All product images are stored and served from Cloudinary.
- Cloudinary URLs are constructed with transformation parameters:
  - Public catalog thumbnail: `w_400,h_400,c_fill,q_auto,f_auto`
  - Product detail hero: `w_800,h_800,c_fill,q_auto,f_auto`
  - Admin thumbnail: `w_80,h_80,c_fill,q_auto,f_auto`
- `f_auto` lets Cloudinary serve WebP/AVIF to supporting browsers.
- Next.js `<Image>` component is used for all images to get automatic lazy
  loading, blur placeholders, and proper `sizes` attributes.
- Images have explicit `width` and `height` to prevent layout shift (CLS = 0).

### Bundle Size
- `shadcn/ui` components are added individually (tree-shakable).
- No large charting libraries on public pages.
- Charts (admin reports only) are loaded dynamically with `next/dynamic`
  to avoid including chart code in the public bundle.
- `next/font` is used for Inter to self-host fonts (eliminates Google Fonts
  external request).

---

## Database Performance

### Connection Pooling
Neon provides a built-in connection pooler (PgBouncer-compatible) accessible
via a separate pooled connection string. This string is used in production
(`DIRECT_DATABASE_URL` for migrations, `DATABASE_URL` for the pooled connection).

Serverless functions can create many short-lived DB connections. Without
pooling, this saturates PostgreSQL's connection limit. The pooler handles this.

### Indexes (Defined in Prisma Schema)

```prisma
// Products: most important indexes
@@index([isListed, deletedAt, availableUnitCount]) // public catalog query
@@index([slug])                                    // slug lookups
@@index([brandId])                               // brand filter
@@index([categoryId])                            // category filter
@@index([createdAt])                             // sort by newest
@@index([availableUnitCount])                     // low availability queries

// Phone Units: critical indexes
@@index([productId, status, deletedAt])          // count queries and active inventory lookup
@@index([deletedAt])                             // soft delete filtering
@@index([sku])                                   // unique SKU lookup
@@index([imei])                                  // admin IMEI lookup

// Full-text search
// Created via raw migration (Prisma doesn't natively support GIN text search)
CREATE INDEX idx_products_search ON products
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

// Bills: query by date and staff
@@index([staffId])
@@index([createdAt])

// Stock movements: query by product
@@index([productId, createdAt])

// Audit logs: query by user and date
@@index([userId, createdAt])
@@index([entityType, entityId])
```

### Query Optimization Practices
- Always select only needed columns (Prisma `select` object, not `findMany()` alone).
- Use `cursor`-based pagination for large tables (audit logs, stock movements).
- Use `offset` pagination only for small result sets (< 10,000 rows) where
  the page number is displayed in the URL.
- N+1 query prevention: always use Prisma's `include` to join related records
  in a single query rather than fetching related records in a loop.

---

## Caching Strategy

| Cache Layer         | What is Cached                  | TTL / Invalidation            |
|---------------------|---------------------------------|-------------------------------|
| Vercel Edge CDN     | Public HTML pages (ISR)         | 60s timer + on-demand purge   |
| Next.js fetch cache | Server component fetches        | Inherits ISR revalidation     |
| Cloudinary CDN      | Product images                  | 30-day cache headers          |
| Browser cache       | Static assets (JS/CSS/fonts)    | 1 year (content-hashed names) |

No Redis or application-level cache is used in v1. The Vercel CDN + ISR
pattern is sufficient for the expected traffic and product catalog size.

---

## Search Performance

### Full-Text Search Implementation
PostgreSQL full-text search using `tsvector` GIN index.

Query example (via Prisma $queryRaw):
```sql
SELECT p.*, ts_rank(
  to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')),
  plainto_tsquery('english', $1)
) AS rank
FROM products p
JOIN brands b ON p.brand_id = b.id
JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
  AND p.is_listed = true
  AND (
    (p.is_unit_tracked = true AND p.available_unit_count > 0)
    OR (p.is_unit_tracked = false AND p.stock_quantity > 0)
    OR p.visibility_override = true
  )
  AND (
    to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') 
      || ' ' || b.name || ' ' || c.name)
    @@ plainto_tsquery('english', $1)
    OR p.sku ILIKE '%' || $1 || '%'
  )
ORDER BY rank DESC, p.created_at DESC
LIMIT $2 OFFSET $3;
```

The GIN index makes the `@@` operator fast. SKU search uses ILIKE as a
fallback for partial matching.

For the billing panel product search, the same query is used but the
public visibility filter is relaxed (show all non-deleted products
including unlisted ones, since staff can bill any product in stock).

### Search Upgrade Path
If search volume or complexity grows beyond PostgreSQL's capabilities,
Algolia or Typesense can be integrated in v2. Product records are synced
to the search service via a webhook on admin product changes.

---

## Pagination

### Public Catalog
- Offset-based pagination via `page` and `pageSize` URL params.
- Default: 24 per page. Max: 100 per page.
- Total count is fetched with `prisma.product.count()` in the same request
  (Prisma runs them efficiently).

### Admin Tables
- Offset-based pagination, 50 per page.

### Audit Logs / Stock Movements (large tables)
- Cursor-based pagination using `cursor` and `take` for efficient deep paging.

---

## Performance Budget (Target)

| Metric          | Target (Public Pages)  | Measured Via                |
|-----------------|------------------------|-----------------------------|
| TTFB            | < 200ms (cached)       | Vercel Analytics            |
| LCP             | < 2.5s                 | Google PageSpeed Insights   |
| CLS             | 0 (explicit dimensions)| Lighthouse                  |
| FID / INP       | < 100ms                | Vercel Web Vitals           |
| JS Bundle (page)| < 150KB gzipped        | next build output           |
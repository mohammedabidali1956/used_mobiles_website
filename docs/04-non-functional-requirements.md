# docs/04-NON-FUNCTIONAL-REQUIREMENTS.md

# Non-Functional Requirements

---

## Performance

### NFR-PERF-01 — Public Page Load
- Time to First Byte (TTFB) for public product pages: ≤ 200ms (CDN cache hit).
- Largest Contentful Paint (LCP): ≤ 2.5 seconds on a 4G connection.
- Product catalog page with 24 items: full render ≤ 3 seconds on cold load.

### NFR-PERF-02 — Admin Panel
- Admin product list (50 items): render ≤ 1.5 seconds.
- All admin CRUD operations: server response ≤ 500ms for standard operations.
- Report generation (30-day range): ≤ 3 seconds.

### NFR-PERF-03 — Billing Panel
- Product search results: appear ≤ 300ms after debounce (from a warm connection).
- Bill creation (5 items): server confirmation ≤ 800ms including stock decrement.

### NFR-PERF-04 — Throughput
- System must handle 500 concurrent public visitors without degradation.
- Database connection pool must be sized for burst traffic (Neon serverless
  handles this automatically with pooler).

---

## Availability

### NFR-AVAIL-01
- Target uptime: 99.9% monthly (Vercel + Neon SLAs meet this).
- The system must function without any dependency on any developer's local machine.
- Database backups must run automatically without manual intervention.

### NFR-AVAIL-02
- If the CDN (Vercel edge) goes down, direct origin access must still return pages.
- If Cloudinary is unavailable, product pages must display a fallback placeholder
  image rather than broken images.

---

## Security

### NFR-SEC-01 — Authentication
- All passwords hashed with bcrypt, cost factor 12.
- JWT tokens signed with a secret stored only in environment variables.
- Session cookies: HttpOnly, Secure, SameSite=Lax.

### NFR-SEC-02 — Authorization
- Every admin and billing API route validates the session and role server-side.
- Client-side route guards are for UX only; server-side checks are always the
  authoritative gate.

### NFR-SEC-03 — Input Validation
- All user inputs validated with Zod schemas on the server side.
- No user input is concatenated directly into SQL strings (Prisma parameterizes
  all queries).

### NFR-SEC-04 — Data Exposure
- Cost price is never returned in any public API response.
- Internal notes are never returned in any public API response.
- Admin-only fields are stripped server-side using Zod `omit` or select projections.

### NFR-SEC-05 — Rate Limiting
- Login endpoint: 10 attempts per IP per 15 minutes.
- Public product search: 120 requests per IP per minute (prevents scraping).
- Billing endpoints: 60 requests per user per minute.

### NFR-SEC-06 — HTTPS
- All traffic must be HTTPS. Vercel enforces this by default.
- No mixed content.

### NFR-SEC-07 — CORS
- API routes are not publicly callable from external origins (no public CORS headers).
- The app is a same-origin system; no external API consumer is expected in v1.

---

## Scalability

### NFR-SCALE-01
- Architecture must support horizontal scaling via Vercel's serverless function model.
- Database connection pooling (via Neon's built-in pooler) must be configured
  to prevent connection exhaustion under load.

### NFR-SCALE-02
- Catalog growth to 5,000 products must not require architecture changes —
  only index tuning.
- Image storage on Cloudinary has no practical upper limit for this use case.

---

## Maintainability

### NFR-MAINT-01
- All database schema changes must go through Prisma migrations (no manual DDL).
- Every migration must be reversible where possible.

### NFR-MAINT-02
- All business logic lives in service-layer functions, not in route handlers.
  Route handlers only handle request parsing and response formatting.

### NFR-MAINT-03
- Environment-specific config (DB connection string, Cloudinary keys, auth secret)
  must use environment variables. No secrets in source code.

### NFR-MAINT-04
- All API routes must return consistent error response shapes.
- All server errors must be captured by Sentry with context.

---

## Data Integrity

### NFR-DATA-01
- Stock decrements during billing must be wrapped in a database transaction.
  Either all items decrement or none do.

### NFR-DATA-02
- Row-level locking (`SELECT FOR UPDATE`) must be used when reading stock
  before a billing decrement to prevent race conditions between concurrent bills.

### NFR-DATA-03
- Soft deletes must be used for products, categories, and brands.
  Hard deletes are available only to SUPER_ADMIN and require explicit confirmation.

### NFR-DATA-04
- Foreign key constraints must be enforced at the database level, not only in
  application code.

---

## Accessibility

### NFR-A11Y-01
- The public storefront must meet WCAG 2.1 Level AA for core browsing flows.
- All interactive elements must be keyboard accessible.
- Images must have descriptive alt text (set by admin when uploading).

### NFR-A11Y-02
- Color contrast ratios must meet WCAG AA (4.5:1 for normal text).
- Forms must have associated labels.

---

## Browser Compatibility

- Chrome 110+, Firefox 110+, Safari 16+, Edge 110+.
- Mobile: iOS Safari 16+, Chrome for Android.
- No IE11 support required.
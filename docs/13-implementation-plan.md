# docs/14-IMPLEMENTATION-PHASES.md

# Implementation Phases

---

## Phase Overview

| Phase | Focus                               | Duration Estimate |
|-------|-------------------------------------|-------------------|
| 0     | Project setup and infrastructure    | 1–2 days          |
| 1     | Database + Auth foundation          | 2–3 days          |
| 2     | Admin: Product CRUD                 | 4–5 days          |
| 3     | Public storefront                   | 3–4 days          |
| 4     | Staff billing panel                 | 3–4 days          |
| 5     | Admin: Reports, Stock, Users        | 3–4 days          |
| 6     | Polish, performance, SEO            | 2–3 days          |
| 7     | Testing and deployment              | 2–3 days          |

Total: ~20–28 development days for a focused solo developer.

---

## Phase 0: Project Setup and Infrastructure

**Goal:** Working repository, deployable shell, all external services connected.

Tasks:
- [ ] Create GitHub repository.
- [ ] Initialize Next.js 14 project with TypeScript and Tailwind CSS.
- [ ] Install and configure shadcn/ui (run `npx shadcn-ui@latest init`).
- [ ] Create Neon project, obtain connection strings.
- [ ] Create Cloudinary account, obtain API keys.
- [ ] Create Sentry project, obtain DSN.
- [ ] Set up Vercel project, connect to GitHub repository.
- [ ] Configure all environment variables in Vercel (production and preview).
- [ ] Set up `.env.local` and `.env.example`.
- [ ] Write initial `prisma/schema.prisma` with all tables from `docs/05-DATA-MODEL.md`.
- [ ] Run `prisma migrate dev --name init` to create first migration.
- [ ] Deploy the shell to Vercel (should succeed with empty pages).
- [ ] Verify Vercel build + deploy pipeline works end-to-end.

**Validation:** A blank Next.js app is live on Vercel. `prisma studio` shows
all tables in the Neon database. No errors in Sentry.

---

## Phase 1: Database Schema + Authentication

**Goal:** All tables created; SUPER_ADMIN can log in; routes are protected.

Tasks:
- [ ] Write `prisma/seed.ts` to create SUPER_ADMIN and system_config entries.
- [ ] Run seed script against Neon production DB.
- [ ] Install and configure NextAuth.js v5 (`src/lib/auth.ts`).
- [ ] Build `POST /api/auth/[...nextauth]/route.ts` with Credentials provider.
- [ ] Build login page (`/login`) with email/password form.
- [ ] Build Next.js middleware for route protection (check session, redirect if needed).
- [ ] Test login/logout for SUPER_ADMIN.
- [ ] Test protected route redirect works correctly.
- [ ] Build `auth.service.ts` with password comparison logic.

**Validation:** SUPER_ADMIN logs in, sees a blank `/admin` page. Visiting
`/admin` without login redirects to `/login`. Visiting as STAFF redirects
to `/billing` (even if that's blank).

---

## Phase 2: Admin — Product CRUD

**Goal:** Admin can fully manage products, categories, brands, and images.

Tasks:
- [ ] Build admin layout with sidebar navigation.
- [ ] Build Category API routes and service (CRUD).
- [ ] Build Category admin pages (list, create, edit).
- [ ] Build Brand API routes and service (CRUD).
- [ ] Build Brand admin pages (list, create, edit).
- [ ] Build Product service (`product.service.ts`) with all CRUD operations.
- [ ] Build Product API routes (`/api/admin/products/*`).
- [ ] Build Product list page with table, filters, search, pagination.
- [ ] Build Product create/edit form with all fields.
- [ ] Build Cloudinary image uploader component.
- [ ] Integrate image upload: upload to Cloudinary, save record to DB.
- [ ] Build image reorder (drag-and-drop with `@dnd-kit/sortable`).
- [ ] Build product visibility toggle (is_listed, visibility_override).
- [ ] Build product soft delete with confirmation dialog.
- [ ] Build audit log writes for all product operations.
- [ ] Build `audit.service.ts`.

**Validation:**
- Create a product with 3 images, stock = 5, listed = true.
- Edit the product's name and verify update.
- Change visibility to unlisted. Verify it shows as Draft.
- Delete the product (soft). Verify it shows as Deleted in admin.
- Restore the product. Verify it returns to listed state.
- Check the audit log shows all actions.

---

## Phase 3: Public Storefront

**Goal:** A fully working, SEO-optimized public website.

Tasks:
- [ ] Build public layout (navbar, footer).
- [ ] Build `GET /api/products` with all filters and pagination.
- [ ] Build homepage with hero, featured products, categories, brands.
- [ ] Build product catalog page with sidebar filters and product grid.
- [ ] Build `ProductCard` component.
- [ ] Build `ProductFilters` component (URL-state driven).
- [ ] Build product detail page with gallery and specifications.
- [ ] Build category page.
- [ ] Build brand page.
- [ ] Build search API and search results page.
- [ ] Implement ISR revalidation triggers from admin product updates.
- [ ] Build `sitemap.xml` dynamic route.
- [ ] Build `robots.txt` route.
- [ ] Add Open Graph meta tags to all public pages.

**Validation:**
- Create a product as admin, verify it appears on public catalog.
- Verify product at zero stock does NOT appear publicly.
- Verify product with visibility_override at zero stock DOES appear publicly.
- Unlist a product. Verify it disappears from public catalog.
- Relist it. Verify it returns.
- Filter by category on catalog, verify correct products.
- Search for a product by name, verify it appears.
- Check Lighthouse score on product detail page (target: 90+).

---

## Phase 4: Staff Billing Panel

**Goal:** Staff can create bills that atomically decrement stock.

Tasks:
- [ ] Build billing layout.
- [ ] Build `GET /api/billing/products/search` with real-time stock.
- [ ] Build `POST /api/billing/bills` with full transaction logic.
- [ ] Build billing screen UI (two-panel layout).
- [ ] Build `ProductSearchPanel` component with debounced search.
- [ ] Build `BillItemList` component with quantity controls.
- [ ] Build bill total calculations (subtotal, discount, total).
- [ ] Build payment method selector.
- [ ] Build receipt view page.
- [ ] Build print-optimized CSS for receipt.
- [ ] Build `GET /api/billing/bills` for staff bill history.
- [ ] Build bill history page for staff.
- [ ] Test concurrent billing scenario manually (open two browser tabs, bill same product).

**Validation:**
- Log in as STAFF.
- Create a bill for product X (stock = 3), quantity = 2.
- Verify receipt shows correct data.
- Verify product X now has stock = 1.
- Verify product X with stock = 1 still appears on public site.
- Create another bill for product X, quantity = 2. Verify INSUFFICIENT_STOCK error.
- Create a valid bill for product X, quantity = 1 (the last one).
- Verify product X disappears from public site (stock = 0, no override).
- Verify StockMovement records exist for both sales.

---

## Phase 5: Admin — Reports, Stock Management, Users, Audit Logs

**Goal:** Admin has full operational visibility and control.

Tasks:
- [ ] Build Stock Management page (list, adjust stock modal).
- [ ] Build `POST /api/admin/stock/adjust` with transaction + audit log.
- [ ] Build User Management pages (list, create, deactivate).
- [ ] Build User API routes and service.
- [ ] Build Admin Bills view (all bills, filterable).
- [ ] Build Sales report (revenue by period, chart).
- [ ] Build Top Products report.
- [ ] Build Low Stock report.
- [ ] Build Audit Log viewer.
- [ ] Build CSV export for reports.
- [ ] Build Admin Dashboard overview page.

**Validation:**
- Manually adjust stock of product X (+5). Verify stock movement record.
- Create a STAFF user from admin panel. Login as new STAFF, verify billing access.
- Deactivate the STAFF user. Verify they cannot log in.
- View sales report for last 7 days. Verify numbers match known test bills.
- Export low-stock report as CSV. Verify file downloads correctly.

---

## Phase 6: Polish, Performance, and SEO

**Goal:** Production-ready look and feel, performance targets met.

Tasks:
- [ ] Mobile responsiveness audit and fixes for public site.
- [ ] Run Lighthouse on key public pages; resolve performance issues.
- [ ] Set security headers in `next.config.ts`.
- [ ] Set rate limiting middleware.
- [ ] Add `placeholder` images for Cloudinary fallback.
- [ ] Finalize design system (spacing, typography consistency).
- [ ] Check all empty states (no products, no bills, no results).
- [ ] Check all error states (form errors, API errors, 404 page).
- [ ] Add 404 page (`app/not-found.tsx`).
- [ ] Add loading skeletons for key pages.
- [ ] Final copy review (product condition labels, status text, error messages).

---

## Phase 7: Testing and Deployment

**Goal:** Tested, deployed, production-ready.

Tasks:
- [ ] Write unit tests for all service functions.
- [ ] Write integration tests for billing transaction and auth gates.
- [ ] Write Playwright E2E tests for critical user flows.
- [ ] Configure GitHub Actions CI pipeline.
- [ ] Run full deployment checklist from `docs/12-DEPLOYMENT-MODEL.md`.
- [ ] Configure Sentry alerts.
- [ ] Configure UptimeRobot.
- [ ] Final end-to-end test on production URL.
- [ ] Hand over credentials to SUPER_ADMIN.
- [ ] Document post-deployment password change procedure.
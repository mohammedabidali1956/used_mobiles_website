# Implementation Phases

---

## Phase Overview

| Phase | Focus                                         | Duration Estimate |
|-------|-----------------------------------------------|-------------------|
| 0     | Project setup and infrastructure              | 1–2 days          |
| 1     | Database + Auth foundation                    | 2–3 days          |
| 2     | Admin: Product + Phone Unit CRUD              | 5–7 days          |
| 3     | Public storefront (browse + contact)          | 3–4 days          |
| 4     | Staff billing panel (unit-aware)              | 3–4 days          |
| 5     | Admin: Reports, Users, Audit Logs             | 3–4 days          |
| 6     | Polish, performance, SEO, WhatsApp CTAs       | 2–3 days          |
| 7     | Testing and deployment                        | 2–3 days          |

Total: ~21–30 development days for a focused solo developer.

---

## Phase 0: Project Setup and Infrastructure

**Goal:** Working repository, deployable shell, all external services connected.

Tasks:
- [ ] Create GitHub repository (name: `used-mobile`).
- [ ] Initialize Next.js 14 with TypeScript and Tailwind CSS.
- [ ] Install and configure shadcn/ui.
- [ ] Create Neon project; obtain pooled and direct connection strings.
- [ ] Create Cloudinary account; obtain API keys.
- [ ] Create Sentry project; obtain DSN.
- [ ] Set up Vercel project; connect to GitHub.
- [ ] Configure all environment variables in Vercel (production and preview).
- [ ] Set up `.env.local` and `.env.example`.
- [ ] Write `prisma/schema.prisma` with all tables from `docs/05-DATA-MODEL.md`,
  including the `phone_units` table and updated `products` table.
- [ ] Run `prisma migrate dev --name init`.
- [ ] Deploy shell to Vercel; verify pipeline.

**Validation:** Blank Next.js app live on Vercel. `prisma studio` shows all
tables in Neon. `phone_units` table exists with all columns.

---

## Phase 1: Database Schema + Authentication

**Goal:** All tables created; SUPER_ADMIN can log in; routes are protected.

Tasks:
- [ ] Write `prisma/seed.ts`: SUPER_ADMIN user + all system_config entries
  including `whatsapp_number`, `show_battery_health_public = false`.
- [ ] Run seed against Neon.
- [ ] Install and configure NextAuth.js v5 (`src/lib/auth.ts`).
- [ ] Build login page and `api/auth/[...nextauth]` route.
- [ ] Build Next.js middleware for route protection.
- [ ] Test login/logout for SUPER_ADMIN.
- [ ] Test protected route redirects.

**Validation:** SUPER_ADMIN logs in and sees blank `/admin`. Unauthenticated
access to `/admin` redirects to `/login`.

---

## Phase 2: Admin — Product + Phone Unit CRUD

**Goal:** Admin can create products and add individual phone units to inventory.

This is the most important phase. Get it right before building the public site.

Tasks:
- [ ] Build admin layout with sidebar navigation.
- [ ] Build Category CRUD (API + service + admin pages).
- [ ] Build Brand CRUD (API + service + admin pages).
- [ ] Build Product service (`product.service.ts`): create, read, update,
  soft-delete, restore, visibility toggle.
- [ ] Build Product API routes (`/api/admin/products/*`).
- [ ] Build Product list page (table with available_unit_count column).
- [ ] Build Product create/edit form (no variants section; has is_unit_tracked toggle).
- [ ] Build Cloudinary image uploader.
- [ ] Build `phoneUnit.service.ts` with all unit operations:
  - createUnit (transaction: insert unit + increment product count)
  - updateUnit
  - changeUnitStatus (transaction: update status + adjust product count)
- [ ] Build Phone Unit API routes (`/api/admin/products/[id]/units/*`,
  `/api/admin/units/[unitId]/*`).
- [ ] Build Phone Unit Form component (tabs: Basic Info, Accessories, Pricing, Notes).
- [ ] Build Phone Unit Table component with status badges.
- [ ] Integrate unit table into product detail page (collapsible section).
- [ ] Build standalone `/admin/units` page (cross-product unit view).
- [ ] Build Unit Status Change modal (dropdown + reason text).
- [ ] Build `audit.service.ts`; write audit events for all product and unit operations.

**Validation:**
- Create a product (is_unit_tracked = true, is_listed = true).
- Add 3 phone units to it (different grades/storage). Verify `available_unit_count = 3`.
- Mark one unit as IN_REPAIR. Verify `available_unit_count = 2`.
- Verify Prisma Studio shows correct statuses.
- Check audit_logs: PRODUCT_CREATED, 3× UNIT_ADDED, 1× UNIT_STATUS_CHANGED.
- Soft delete the product. Verify `deleted_at` is set.
- Restore it. Verify `deleted_at` is null again.

---

## Phase 3: Public Storefront

**Goal:** Professional browse-only website with WhatsApp/call CTAs. Unit-aware
visibility rules working end-to-end.

Tasks:
- [ ] Build public layout (navbar, footer, floating WhatsApp button).
- [ ] Build `GET /api/products` with unit-aware visibility filter and storage filter.
- [ ] Build `GET /api/products/[slug]` returning product + available units (no IMEI).
- [ ] Build `GET /api/products/[slug]/units` (for client-side refresh).
- [ ] Build homepage: hero, how-it-works strip, featured products, categories, brands,
  shop info section.
- [ ] Build `WhatsAppButton` component with pre-filled message generation.
- [ ] Build `UnitCard` component (grade, storage, color, accessories, price, WhatsApp CTA).
- [ ] Build product catalog page with sidebar filters (including storage filter).
- [ ] Build `ProductCard` component showing available_unit_count.
- [ ] Build product detail page: gallery, summary, units section with UnitCards,
  specifications, related products.
- [ ] Build category and brand pages.
- [ ] Build search results page.
- [ ] Implement ISR revalidatePath triggers from admin product and unit mutations.
- [ ] Build sitemap.xml and robots.txt.
- [ ] Add Open Graph meta tags to all public pages.
- [ ] Build the `useWhatsAppLink` utility function.

**Validation:**
- Create a product with 2 available units. Verify both unit cards appear on the
  public product detail page.
- Mark one unit as SOLD via direct Prisma Studio update (simulating a sale).
  Wait for ISR (or trigger revalidation). Verify only 1 unit card shows.
- Mark the last unit as SOLD. Verify the product disappears from the public catalog.
- Set `visibility_override = true` on that product. Verify it reappears publicly
  with "Out of Stock" shown but no unit cards.
- Verify `unit_imei` is never present in any public API response (check Network tab).
- Check that WhatsApp CTA links point to the configured number.
- Run Lighthouse on the product detail page (target: 90+).

---

## Phase 4: Staff Billing Panel

**Goal:** Staff can create in-person bills that atomically update unit statuses.

Tasks:
- [ ] Build billing layout.
- [ ] Build `GET /api/billing/products/search` returning products with their
  AVAILABLE units (no IMEI, includes battery_health for staff).
- [ ] Build `POST /api/billing/bills` with the full unit-based transaction.
- [ ] Build billing screen UI (two-panel layout).
- [ ] Build `ProductSearchPanel`: search → product card → expand → unit list.
- [ ] Build `UnitSelector` component: shows available units with grade/storage/price.
- [ ] Build `BillItemList`: each unit item shows SKU, grade, storage, color, price.
- [ ] Build bill total calculation (subtotal, discount, total).
- [ ] Build payment method selector.
- [ ] Build receipt page (with unit details; without IMEI).
- [ ] Build print-optimized receipt CSS.
- [ ] Build bill history for staff.
- [ ] Manually test concurrent billing (two browser tabs, same unit, submit simultaneously).

**Validation:**
- Log in as STAFF.
- Search for product X, expand, select unit U1 (stock: AVAILABLE).
- Create bill (Cash payment). Verify receipt shows grade, storage, color.
- Verify U1 status = SOLD in Prisma Studio.
- Verify product X's available_unit_count decremented.
- Verify product X disappears from public site if available_unit_count = 0.
- Open two browser tabs. Add same unit to bill in both. Submit both simultaneously.
  Verify exactly one succeeds; other returns UNIT_NOT_AVAILABLE.
- Verify StockMovement record (type: UNIT_SOLD) exists with before/after status.

---

## Phase 5: Admin — Reports, Users, Audit Logs

**Goal:** Admin has full operational visibility and staff management.

Tasks:
- [ ] Build User Management pages (list, create, deactivate).
- [ ] Build Admin Bills view (all bills, filterable by date/staff).
- [ ] Build Sales report (revenue by period).
- [ ] Build Unit Status report (count by status per product).
- [ ] Build Low Availability report (products below threshold).
- [ ] Build Audit Log viewer.
- [ ] Build CSV export for reports.
- [ ] Build Admin Dashboard overview (unit counts by status, revenue today).
- [ ] Build System Settings page (SUPER_ADMIN only; edit system_config including
  `whatsapp_number` and `show_battery_health_public`).

**Validation:**
- Create a STAFF user, log in, create a bill. Verify bill in admin bills view.
- Verify unit status report shows correct counts.
- Change `whatsapp_number` in settings. Verify WhatsApp links on public site use
  the new number (after ISR revalidation).
- Toggle `show_battery_health_public = true`. Verify battery_health appears on
  public unit cards (after revalidation).

---

## Phase 6: Polish, Performance, SEO, and WhatsApp CTAs

**Goal:** Production-ready look and feel. Performance and SEO targets met.

Tasks:
- [ ] Mobile audit and fixes for all public pages.
- [ ] Lighthouse run on homepage and product detail; resolve issues.
- [ ] Security headers in `next.config.ts`.
- [ ] Rate limiting middleware.
- [ ] Cloudinary placeholder image fallback.
- [ ] Design system consistency check (grade badge colors, spacing, typography).
- [ ] All empty states (no products, no units, no search results, no bills).
- [ ] All error states (form errors, unit-not-available error on billing).
- [ ] 404 page (`app/not-found.tsx`).
- [ ] Loading skeletons for public catalog and product detail.
- [ ] Verify floating WhatsApp button appears on all public pages.
- [ ] Verify all contact numbers throughout the site match system_config.
- [ ] Final copy review: grade labels, condition labels, status text, error messages.

---

## Phase 7: Testing and Deployment

**Goal:** Tested, deployed, production-ready.

Tasks:
- [ ] Write unit tests for all service functions (including phoneUnit.service.ts).
- [ ] Write integration tests: bill creation transaction, unit status changes,
  concurrent billing of the same unit.
- [ ] Write Playwright E2E tests for: public browsing, WhatsApp CTA links,
  admin unit management, billing flow.
- [ ] Configure GitHub Actions CI pipeline.
- [ ] Run full deployment checklist from `docs/12-DEPLOYMENT-MODEL.md`.
- [ ] Seed at least 5 real products with real phone units before handover.
- [ ] Verify WhatsApp links open correctly on a real mobile device.
- [ ] Verify receipt prints correctly on a standard printer.
- [ ] Final end-to-end test on production URL.
- [ ] Hand over credentials and training to the owner.
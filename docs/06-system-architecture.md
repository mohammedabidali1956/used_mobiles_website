# System Architecture

---

## Architecture Style
This is a **full-stack monorepo** using Next.js 14 App Router. All application
code lives in a single repository. The public website, admin dashboard, and
billing panel coexist in the same Next.js app deployed to Vercel. The database
is external on Neon.

There is no checkout, cart, payment gateway, or order management system.
The public website is browse-only. All sales happen in person at the counter
via the billing panel.

---

## High-Level Architecture
┌───────────────────────────────────────────────────────┐

│                        INTERNET                       │

└───────────────────────┬───────────────────────────────┘

│

┌────────────▼────────────┐

│     Vercel Edge CDN     │

│   (ISR cached public    │

│    pages + static)      │

└────────────┬────────────┘

│

┌────────────▼────────────┐

│   Next.js App (Vercel   │

│   Serverless Functions) │

│                         │

│  /             (public) │

│  /products/*   (public) │

│  /categories/* (public) │

│  /brands/*     (public) │

│  /search       (public) │

│  /login        (auth)   │

│  /admin/*      (admin)  │

│  /billing/*    (staff)  │

│  /api/*        (API)    │

└────────────┬────────────┘

│

┌─────────────────┼──────────────────┐

│                 │                  │

┌─────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐

│    Neon    │  │  Cloudinary  │  │    Sentry    │

│ PostgreSQL │  │  Image CDN   │  │    Errors    │

└────────────┘  └──────────────┘  └──────────────┘

**Critical production fact:** Once deployed to Vercel + Neon, the application
runs entirely in the cloud. The developer's laptop is not part of the
production infrastructure.

---

## Project Directory Structure
used-mobile/

├── prisma/

│   ├── schema.prisma               # Full DB schema including phone_units

│   ├── migrations/                 # Auto-generated migration files

│   └── seed.ts                     # Seed: SUPER_ADMIN + system_config

├── src/

│   ├── app/

│   │   ├── (public)/               # Public storefront (browse-only)

│   │   │   ├── layout.tsx          # Public layout (navbar, footer, WhatsApp FAB)

│   │   │   ├── page.tsx            # Homepage

│   │   │   ├── products/

│   │   │   │   ├── page.tsx        # Catalog (filtered grid)

│   │   │   │   └── [slug]/

│   │   │   │       └── page.tsx    # Product detail + units list + contact CTAs

│   │   │   ├── categories/

│   │   │   │   └── [slug]/page.tsx

│   │   │   ├── brands/

│   │   │   │   └── [slug]/page.tsx

│   │   │   └── search/page.tsx

│   │   ├── (auth)/

│   │   │   └── login/page.tsx

│   │   ├── (admin)/

│   │   │   ├── layout.tsx          # Admin layout (sidebar)

│   │   │   └── admin/

│   │   │       ├── page.tsx        # Dashboard

│   │   │       ├── products/

│   │   │       │   ├── page.tsx

│   │   │       │   ├── new/page.tsx

│   │   │       │   └── [id]/

│   │   │       │       ├── page.tsx

│   │   │       │       └── edit/page.tsx

│   │   │       ├── units/

│   │   │       │   ├── page.tsx    # All units (cross-product view)

│   │   │       │   └── [unitId]/

│   │   │       │       └── edit/page.tsx

│   │   │       ├── categories/

│   │   │       ├── brands/

│   │   │       ├── users/

│   │   │       ├── bills/

│   │   │       ├── reports/

│   │   │       ├── audit-logs/

│   │   │       └── settings/       # SUPER_ADMIN system_config editor

│   │   ├── (billing)/

│   │   │   ├── layout.tsx

│   │   │   └── billing/

│   │   │       ├── page.tsx        # Billing screen (POS)

│   │   │       └── [id]/page.tsx   # Receipt view

│   │   └── api/

│   │       ├── auth/

│   │       │   └── [...nextauth]/route.ts

│   │       ├── products/

│   │       │   ├── route.ts                # Public: list products

│   │       │   └── [slug]/

│   │       │       ├── route.ts            # Public: product detail

│   │       │       └── units/route.ts      # Public: available units for product

│   │       ├── search/route.ts

│   │       ├── categories/route.ts

│   │       ├── brands/route.ts

│   │       ├── admin/

│   │       │   ├── products/

│   │       │   │   ├── route.ts

│   │       │   │   └── [id]/

│   │       │   │       ├── route.ts

│   │       │   │       ├── images/route.ts

│   │       │   │       ├── images/reorder/route.ts

│   │       │   │       ├── visibility/route.ts

│   │       │   │       └── units/

│   │       │   │           ├── route.ts    # List / create units for product

│   │       │   │           └── [unitId]/route.ts

│   │       │   ├── units/

│   │       │   │   ├── route.ts            # All units (search, filter)

│   │       │   │   └── [unitId]/

│   │       │   │       ├── route.ts        # Get/Update unit

│   │       │   │       └── status/route.ts # Change unit status

│   │       │   ├── categories/

│   │       │   ├── brands/

│   │       │   ├── users/

│   │       │   ├── bills/

│   │       │   ├── reports/

│   │       │   ├── audit-logs/

│   │       │   └── settings/route.ts

│   │       └── billing/

│   │           ├── products/search/route.ts  # Returns products + units

│   │           └── bills/route.ts            # Create bill + set units to SOLD

│   ├── components/

│   │   ├── ui/                         # shadcn/ui components

│   │   ├── public/

│   │   │   ├── ProductCard.tsx

│   │   │   ├── ProductGrid.tsx

│   │   │   ├── ProductFilters.tsx

│   │   │   ├── ProductGallery.tsx

│   │   │   ├── UnitCard.tsx            # Individual unit display on product page

│   │   │   ├── WhatsAppButton.tsx      # Reusable WhatsApp CTA

│   │   │   ├── SearchBar.tsx

│   │   │   └── Navbar.tsx

│   │   ├── admin/

│   │   │   ├── Sidebar.tsx

│   │   │   ├── ProductForm.tsx

│   │   │   ├── PhoneUnitForm.tsx       # Add/edit phone unit

│   │   │   ├── PhoneUnitTable.tsx      # Unit list in admin

│   │   │   ├── ImageUploader.tsx

│   │   │   ├── DataTable.tsx

│   │   │   └── UnitStatusModal.tsx     # Change unit status with reason

│   │   └── billing/

│   │       ├── BillItemList.tsx

│   │       ├── ProductSearchPanel.tsx  # Search → expand → select unit

│   │       ├── UnitSelector.tsx        # Unit list within a product result

│   │       └── Receipt.tsx

│   ├── lib/

│   │   ├── prisma.ts

│   │   ├── auth.ts

│   │   ├── cloudinary.ts

│   │   └── utils.ts

│   ├── services/

│   │   ├── product.service.ts

│   │   ├── phoneUnit.service.ts        # All phone unit business logic

│   │   ├── category.service.ts

│   │   ├── brand.service.ts

│   │   ├── billing.service.ts

│   │   ├── user.service.ts

│   │   └── audit.service.ts

│   ├── schemas/

│   │   ├── product.schema.ts

│   │   ├── phoneUnit.schema.ts         # Zod schema for phone unit

│   │   ├── bill.schema.ts

│   │   ├── category.schema.ts

│   │   ├── brand.schema.ts

│   │   └── user.schema.ts

│   ├── types/

│   │   ├── index.ts

│   │   ├── product.types.ts

│   │   ├── phoneUnit.types.ts

│   │   ├── billing.types.ts

│   │   └── api.types.ts

│   └── hooks/

│       ├── useProductSearch.ts

│       ├── useBillState.ts

│       ├── useDebounce.ts

│       └── useWhatsAppLink.ts          # Generates WhatsApp deep links

├── public/

│   ├── logo.svg

│   └── placeholder-product.jpg

├── docs/

├── .env.local

├── .env.example

├── next.config.ts

├── tailwind.config.ts

├── tsconfig.json

└── package.json

---

## Layer Responsibilities

### Route Layer (`app/api/*/route.ts`)
- Parse and validate request (Zod schema).
- Check session and role via NextAuth `getServerSession`.
- Call the appropriate service function.
- Format and return the response.
- No business logic.

### Service Layer (`services/*.service.ts`)
- All business logic lives here.
- `phoneUnit.service.ts` owns all phone unit operations including status
  transitions and available_unit_count maintenance.
- `billing.service.ts` owns the atomic bill creation transaction.
- Fully testable in isolation.

### Prisma Layer (`lib/prisma.ts`)
- Single Prisma Client instance.
- All DB queries go through this instance.

### Component Layer (`components/`)
- Display and interaction only.
- No direct DB access.

---

## Rendering Strategy

| Route                   | Method                      | Reason                                          |
|-------------------------|-----------------------------|-------------------------------------------------|
| Public homepage         | ISR (60s revalidation)      | Infrequent changes; CDN-cacheable               |
| Product catalog         | ISR (60s revalidation)      | Unit availability changes warrant freshness     |
| Product detail          | ISR (30s revalidation)      | Unit availability critical; on-demand purge     |
| Category/Brand pages    | ISR (120s revalidation)     | Infrequent changes                              |
| Search results          | Dynamic (SSR)               | Query-specific; not cacheable globally          |
| Admin pages             | Dynamic (SSR)               | Real-time data required                         |
| Billing panel           | Dynamic (SSR)               | Real-time unit availability required            |

On-demand revalidation via `revalidatePath()` is called whenever:
- A product is updated or listed/unlisted.
- A phone unit changes from or to AVAILABLE status.
This ensures the public page reflects unit availability within seconds of an
admin or billing action.

---

## Data Flow: Unit Sold → Public Page Reflects Zero Availability
Staff creates bill with unit X

↓

POST /api/billing/bills

↓

billing.service.createBill() [transaction]

→ PhoneUnit.status AVAILABLE → SOLD

→ Product.available_unit_count -= 1

→ StockMovement created

→ Bill and BillItem created

↓

COMMIT TRANSACTION

↓

revalidatePath('/products/[slug]')

revalidatePath('/products')

↓

Next CDN cache purged for that product

↓

Next public request fetches fresh data

→ available_unit_count = 0

→ product no longer appears in catalog

---

## Environment Separation

| Environment | Database        | Vercel Env | Purpose              |
|-------------|-----------------|------------|----------------------|
| Local dev   | Neon dev branch | —          | Feature development  |
| Preview     | Neon dev branch | Preview    | PR review, UAT       |
| Production  | Neon production | Production | Live business data   |
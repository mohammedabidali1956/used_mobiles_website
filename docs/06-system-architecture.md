# docs/06-SYSTEM-ARCHITECTURE.md

# System Architecture

---

## Architecture Style
This is a **full-stack monorepo** using Next.js 14 App Router. All application
code lives in a single repository. The frontend and backend API co-exist in the
same Next.js app, deployed together to Vercel. The database is external and
managed separately on Neon.

This is not a microservices architecture. A monolith-with-clear-boundaries is
the appropriate choice for a team of this size and a business of this scale.
Premature service decomposition adds operational overhead without benefit.

---

## High-Level Architecture
┌──────────────────────────────────────────────────────────────────┐

│                          INTERNET                                │

└──────────────────────────┬───────────────────────────────────────┘

│

┌────────────▼────────────┐

│     Vercel Edge CDN     │

│  (Static assets, ISR,   │

│   cached public pages)  │

└────────────┬────────────┘

│

┌────────────▼────────────┐

│   Next.js App (Vercel   │

│   Serverless Functions) │

│                         │

│  ┌─────────────────┐    │

│  │  Public Routes  │    │

│  │  /              │    │

│  │  /products      │    │

│  │  /products/[s]  │    │

│  │  /categories/[s]│    │

│  │  /brands/[s]    │    │

│  │  /search        │    │

│  └─────────────────┘    │

│  ┌─────────────────┐    │

│  │  Auth Routes    │    │

│  │  /login         │    │

│  │  /api/auth/*    │    │

│  └─────────────────┘    │

│  ┌─────────────────┐    │

│  │  Admin Routes   │    │

│  │  /admin/*       │    │

│  └─────────────────┘    │

│  ┌─────────────────┐    │

│  │  Staff Routes   │    │

│  │  /billing/*     │    │

│  └─────────────────┘    │

│  ┌─────────────────┐    │

│  │   API Routes    │    │

│  │  /api/*         │    │

│  └─────────────────┘    │

└────────────┬────────────┘

│

┌─────────────────┼──────────────────┐

│                 │                  │

┌────────▼───────┐  ┌──────▼──────┐  ┌───────▼──────────┐

│  Neon          │  │ Cloudinary  │  │  Sentry           │

│  PostgreSQL    │  │ Image CDN   │  │  Error Tracking   │

│  (Production   │  │             │  │                   │

│   Database)    │  │             │  │                   │

└────────────────┘  └─────────────┘  └──────────────────┘

---

## Project Directory Structure
mobilex/

├── prisma/

│   ├── schema.prisma           # Full DB schema

│   └── migrations/             # Auto-generated migration files

│       └── seed.ts             # Seed script (SUPER_ADMIN + system_config)

├── src/

│   ├── app/                    # Next.js App Router

│   │   ├── (public)/           # Route group: public storefront

│   │   │   ├── layout.tsx      # Public layout (header, footer)

│   │   │   ├── page.tsx        # Homepage

│   │   │   ├── products/

│   │   │   │   ├── page.tsx    # Catalog

│   │   │   │   └── [slug]/

│   │   │   │       └── page.tsx # Product detail

│   │   │   ├── categories/

│   │   │   │   └── [slug]/page.tsx

│   │   │   ├── brands/

│   │   │   │   └── [slug]/page.tsx

│   │   │   └── search/page.tsx

│   │   ├── (auth)/             # Route group: authentication

│   │   │   └── login/page.tsx

│   │   ├── (admin)/            # Route group: admin panel

│   │   │   ├── layout.tsx      # Admin layout (sidebar nav)

│   │   │   └── admin/

│   │   │       ├── page.tsx            # Dashboard

│   │   │       ├── products/

│   │   │       │   ├── page.tsx        # Product list

│   │   │       │   ├── new/page.tsx    # Create product

│   │   │       │   └── [id]/

│   │   │       │       ├── page.tsx    # View product

│   │   │       │       └── edit/page.tsx

│   │   │       ├── categories/

│   │   │       ├── brands/

│   │   │       ├── users/

│   │   │       ├── bills/

│   │   │       ├── stock/

│   │   │       ├── reports/

│   │   │       └── audit-logs/

│   │   ├── (billing)/          # Route group: staff billing

│   │   │   ├── layout.tsx      # Billing layout

│   │   │   └── billing/

│   │   │       ├── page.tsx    # Billing screen

│   │   │       └── [id]/page.tsx # Receipt view

│   │   └── api/                # API Route handlers

│   │       ├── auth/

│   │       │   └── [...nextauth]/route.ts

│   │       ├── products/

│   │       │   ├── route.ts

│   │       │   └── [id]/route.ts

│   │       ├── admin/

│   │       │   ├── products/

│   │       │   ├── categories/

│   │       │   ├── brands/

│   │       │   ├── users/

│   │       │   ├── bills/

│   │       │   ├── stock/

│   │       │   └── audit-logs/

│   │       └── billing/

│   │           ├── products/search/route.ts

│   │           └── bills/route.ts

│   ├── components/

│   │   ├── ui/                 # shadcn/ui components (auto-generated)

│   │   ├── public/             # Public storefront components

│   │   │   ├── ProductCard.tsx

│   │   │   ├── ProductGrid.tsx

│   │   │   ├── ProductFilters.tsx

│   │   │   ├── ProductGallery.tsx

│   │   │   ├── SearchBar.tsx

│   │   │   └── Navbar.tsx

│   │   ├── admin/              # Admin panel components

│   │   │   ├── Sidebar.tsx

│   │   │   ├── ProductForm.tsx

│   │   │   ├── ImageUploader.tsx

│   │   │   ├── DataTable.tsx

│   │   │   └── StockAdjustModal.tsx

│   │   └── billing/            # Billing panel components

│   │       ├── BillItemList.tsx

│   │       ├── ProductSearchPanel.tsx

│   │       └── Receipt.tsx

│   ├── lib/

│   │   ├── prisma.ts           # Prisma client singleton

│   │   ├── auth.ts             # NextAuth configuration

│   │   ├── cloudinary.ts       # Cloudinary client config

│   │   └── utils.ts            # Shared utility functions

│   ├── services/               # Business logic layer (pure functions)

│   │   ├── product.service.ts

│   │   ├── category.service.ts

│   │   ├── brand.service.ts

│   │   ├── billing.service.ts

│   │   ├── stock.service.ts

│   │   ├── user.service.ts

│   │   └── audit.service.ts

│   ├── schemas/                # Zod validation schemas

│   │   ├── product.schema.ts

│   │   ├── bill.schema.ts

│   │   ├── category.schema.ts

│   │   ├── brand.schema.ts

│   │   └── user.schema.ts

│   ├── types/                  # TypeScript type definitions

│   │   ├── index.ts

│   │   ├── product.types.ts

│   │   ├── billing.types.ts

│   │   └── api.types.ts

│   └── hooks/                  # Client-side React hooks

│       ├── useProductSearch.ts

│       ├── useBillState.ts

│       └── useDebounce.ts

├── public/                     # Static assets

│   ├── logo.svg

│   └── placeholder-product.jpg

├── docs/                       # This documentation pack

├── .env.local                  # Local dev env (gitignored)

├── .env.example                # Template for env vars

├── next.config.ts

├── tailwind.config.ts

├── tsconfig.json

└── package.json

---

## Layer Responsibilities

### Route Layer (`app/api/*/route.ts`)
- Parse and validate incoming request (Zod schema).
- Extract and verify session/role (NextAuth `getServerSession`).
- Call the appropriate service function with validated data.
- Format and return the response.
- Never contain business logic.

### Service Layer (`services/*.service.ts`)
- Contain all business logic.
- Call Prisma for database operations.
- Write audit log entries.
- Handle errors and throw typed errors.
- Never import from `app/` (no Next.js dependencies).
- Fully unit testable in isolation.

### Prisma Layer (`lib/prisma.ts`)
- Single Prisma Client instance shared across the app.
- All DB queries go through this instance.

### Component Layer (`components/`)
- React components — display and interaction only.
- Never call the database directly.
- Call API routes via `fetch` or server actions.

---

## Rendering Strategy

| Route Type          | Rendering Method            | Reason                                    |
|---------------------|-----------------------------|-------------------------------------------|
| Public homepage     | ISR (60s revalidation)      | Changes infrequently; CDN-cacheable       |
| Product catalog     | ISR (60s revalidation)      | Stock changes warrant some freshness      |
| Product detail      | ISR (30s revalidation)      | More critical to be fresh                 |
| Category/Brand page | ISR (120s revalidation)     | Infrequent changes                        |
| Search results      | Server-side render (dynamic)| Query-specific; cannot be cached globally |
| Admin panel pages   | Server-side render (dynamic)| Real-time data required; no caching       |
| Billing panel       | Server-side render (dynamic)| Real-time stock required; no caching      |

Public pages use ISR so they benefit from Vercel's CDN cache while still
becoming fresh within the revalidation window. On-demand revalidation is
triggered when admin updates a product, ensuring changes propagate quickly
without waiting for the timer.

---

## Data Flow: Product Update → Public Page Invalidation
Admin edits product

↓

POST /api/admin/products/[id]

↓

product.service.updateProduct()

↓

Prisma updates database

↓

Call revalidatePath('/products/[slug]')

Call revalidatePath('/products')

Call revalidatePath('/categories/[slug]')

↓

Next.js CDN cache is purged for affected paths

↓

Next public request fetches fresh data from DB

↓

New ISR cache entry written

---

## Data Flow: Bill Creation → Stock Decrement

See `docs/08-PRODUCT-INVENTORY-LOGIC.md` for the full transactional flow diagram.

---

## Environment Separation

| Environment | Database        | Vercel Env  | Purpose                            |
|-------------|-----------------|-------------|------------------------------------|
| Local dev   | Neon dev branch | —           | Feature development                |
| Preview     | Neon dev branch | Preview      | PR review, UAT                     |
| Production  | Neon production | Production   | Live business data                 |

Neon's branch feature allows a complete DB copy for development without
touching production data.
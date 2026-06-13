# docs/01-PROJECT-OVERVIEW.md

# Project Overview

## System Name
**Mobilex** — Used Mobile Phone Retail Platform
*(Rename to match the owner's brand before launch.)*

---

## Business Description
Mobilex is a local used mobile phone and accessories shop. The business buys,
refurbishes, and resells used smartphones and related accessories. The shop
operates from a physical storefront with walk-in customers, and requires a
professional online presence combined with an internal management platform to
replace manual, error-prone workflows.

---

## System Purpose
This is a dual-purpose platform with two distinct audiences:

1. **Public Storefront** — A premium e-commerce website where customers can
   browse, search, and explore available products with full confidence that what
   they see is actually in stock.

2. **Internal Business Platform** — An admin dashboard and a staff billing panel
   for managing inventory, products, pricing, categories, staff accounts, and
   sales records in real time.

This is not a content site. Every transaction in the internal platform has
real-world consequences on inventory. The system must treat the database as the
source of truth at all times.

---

## Key Stakeholders

| Stakeholder         | System Role   | Primary Needs                                                      |
|---------------------|---------------|--------------------------------------------------------------------|
| Business Owner      | Super Admin   | Full control: products, pricing, staff, reports, system config     |
| Shop Staff          | Staff         | Fast bill creation, product lookup, receipt printing               |
| Public Customer     | Unauthenticated | Browse products, view details, filter by brand/category/condition |
| Developer/Maintainer | System Operator | Deployable, maintainable, monitorable codebase                  |

---

## Business Objectives

1. Automate stock tracking — billing reduces stock; no manual count needed.
2. Prevent mismatch — what shows online must reflect what exists in the shop.
3. Give the owner independent control over website visibility regardless of stock.
4. Reduce counter billing time with a fast, minimal-click interface.
5. Project a professional, trustworthy image to online customers.
6. Run entirely on hosted cloud infrastructure — no dependency on any local machine.
7. Support 1,000+ SKUs with fast browsing, filtering, and full-text search.
8. Audit all critical operations performed by admin or staff users for accountability.

---

## Explicit Scope: What This System IS

- A production e-commerce public storefront
- A product and inventory management admin panel
- A counter billing and receipt generation system
- A role-based access-controlled internal business tool
- An auditable operations log for all stock and product changes

## Explicit Scope: What This System IS NOT (v1)

- Not a marketplace (single seller)
- Not a payment gateway (physical payment at counter; system does not process cards)
- Not a customer account or loyalty system (no customer registration)
- Not a POS hardware integration (software-only)
- Not a multi-location inventory system
- Not an SMS/email notification system

---

## Explicit Assumptions

1. The owner provides a domain name for production deployment.
2. Hosting is fully cloud-based; the developer's local machine is not a server.
3. A single currency is used throughout (symbol configurable via environment variable).
4. Physical payment is handled at the counter; the system generates bills only.
5. Product variants are limited to storage capacity and color in v1.
6. All product images are uploaded to and served from Cloudinary CDN.
7. Staff accounts are created by the owner/admin; no public registration.
8. Maximum concurrent staff using the billing screen: 2–5 at any time.
9. Expected peak public traffic: ~500 concurrent visitors during promotions.
10. Internet access is available at the shop counter for the billing screen.

---

## Chosen Technology Stack

### Selection Criteria
- Production reliability over novelty
- Strong typing to catch errors before deployment
- Managed hosting so no local server dependency exists
- Minimal operational overhead for a solo/small-team maintainer
- Scalable to 10× current needs without architecture change

| Layer           | Technology                   | Justification                                                                   |
|-----------------|------------------------------|---------------------------------------------------------------------------------|
| Framework       | Next.js 14 (App Router)      | SSR/SSG for public pages (SEO + performance); API routes for backend; one repo  |
| Language        | TypeScript (strict mode)     | Type safety across client and server; eliminates entire classes of runtime bugs |
| Styling         | Tailwind CSS + shadcn/ui     | Utility-first; shadcn provides accessible, fully customizable components        |
| ORM             | Prisma                       | Type-safe DB access; schema-as-code migrations; excellent developer experience  |
| Database        | PostgreSQL (Neon)            | ACID transactions — mandatory for inventory integrity; proven at scale          |
| Auth            | NextAuth.js v5 (Auth.js)     | Session management, credential provider, App Router compatible                  |
| Image CDN       | Cloudinary                   | Free tier sufficient; automatic optimization; CDN delivery globally             |
| Validation      | Zod                          | Runtime schema validation shared between client forms and server handlers       |
| Forms           | React Hook Form + Zod        | Performant forms; resolver integrates directly with Zod schemas                 |
| Hosting         | Vercel                       | Zero-config Next.js deployment; edge CDN; preview deployments per PR            |
| DB Hosting      | Neon                         | Serverless PostgreSQL; connection pooling built-in; automated backups           |
| Error Tracking  | Sentry                       | Production error monitoring; alerts when something breaks in production         |
| Analytics       | Vercel Analytics             | Lightweight; no cookie banner needed; built into Vercel dashboard               |

### Why Not Alternative Choices
- **Separate Express API**: Adds a second deployment; Next.js API routes are sufficient.
- **MongoDB**: No ACID transactions — disqualified for inventory operations requiring atomicity.
- **Firebase**: Not suitable for relational inventory + billing records.
- **Supabase as backend**: Considered; Neon + Prisma gives more control and is simpler.
- **Remix**: Strong alternative but Next.js has superior Vercel integration and ecosystem.
- **MySQL/PlanetScale**: PostgreSQL preferred for JSON support, full-text search, and row locking.
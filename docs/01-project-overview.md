# Project Overview

## System Name
**Used Mobile** — Used Mobile Phone Retail Platform

## Business Details
**Shop Name:** Used Mobile
**Address:** Hyder Manzil, 7 Tombs Rd, beside Al Ameen Meat Mart, Samatha Colony,
Bentoubavdi, Samata Colony, Toli Chowki, Hyderabad, Telangana 500008
**City:** Hyderabad, India
**Currency:** Indian Rupee (₹)

---

## Business Description
Used Mobile is a local used mobile phone shop in Hyderabad. The business buys,
refurbishes, and resells used smartphones and related accessories. Walk-in
customers are the primary source of sales. The website serves as an online
discovery and showcase platform — customers browse the catalog, identify phones
they are interested in, and then contact the shop via WhatsApp or phone call
before visiting in person to complete the purchase.

This is not an online store with a checkout. It is a browse-and-contact
storefront backed by a robust internal management platform.

---

## Customer Purchase Journey
Customer sees phone online (public website)

↓

Contacts shop via WhatsApp / phone call

↓

Visits the shop in person

↓

Inspects the device physically

↓

Purchases and pays at the counter

↓

Staff creates a bill through the billing panel
This journey is fundamental to all design decisions. The public website
is built around discovery and trust, not transaction completion.

---

## System Purpose
This is a dual-purpose platform with two distinct audiences:

1. **Public Storefront** — A professional browse-only website where customers can
   explore available phones in detail, see condition grades, storage options,
   pricing, and accessories included. The website builds trust and drives
   in-person footfall. There is no cart, no checkout, and no online payment.

2. **Internal Business Platform** — An admin dashboard and staff billing panel
   for managing individual phone units, products, pricing, categories, staff
   accounts, and generating in-person sale receipts.

The system treats the database as the source of truth at all times.

---

## Key Stakeholders

| Stakeholder         | System Role     | Primary Needs                                                          |
|---------------------|-----------------|------------------------------------------------------------------------|
| Business Owner      | Super Admin     | Full control: inventory units, pricing, staff, reports, system config  |
| Shop Staff          | Staff           | Fast bill creation, unit lookup, receipt printing                      |
| Public Customer     | Unauthenticated | Browse phones, see grades/conditions, contact shop via WhatsApp/call   |
| Developer/Maintainer | System Operator | Deployable, maintainable, monitorable codebase                        |

---

## Business Objectives

1. **Showcase inventory professionally** — customers trust what they see online.
2. **Track every used phone as an individual unit** — each phone has its own
   identity: IMEI, grade, battery health, accessories included, condition.
3. **Drive contact** — every public page has clear WhatsApp and call CTAs.
4. **Automate billing** — in-person sale billed at counter changes unit status
   to sold; inventory stays accurate without manual effort.
5. **Prevent mismatch** — only units with AVAILABLE status appear online.
6. **Run fully in the cloud** — no dependency on any local machine.
7. **Support 1,000+ individual phone units** with fast browsing and filtering.
8. **Audit all internal operations** for accountability.

---

## Explicit Scope: What This System IS

- A professional public browse-and-contact website
- An individual phone unit inventory management system
- An admin dashboard for full product and unit management
- A counter billing panel for generating in-person sale receipts
- A role-based access-controlled internal business tool
- An auditable operations log for all unit and product changes

## Explicit Scope: What This System IS NOT (v1)

- Not an online store (no cart, no checkout, no online payment)
- Not a delivery or shipping system
- Not a customer account or order tracking system
- Not a marketplace (single seller)
- Not a POS hardware integration (software-only)
- Not a multi-location inventory system
- Not an SMS/email notification system
- Not a payment gateway integration

---

## Explicit Assumptions

1. The owner provides a domain name for production deployment.
2. Hosting is fully cloud-based; the developer's local machine is not a server.
3. Physical payment is handled at the counter; the system generates bills only.
4. Each used phone is tracked as an individual unit with its own attributes.
5. Accessories (cases, chargers sold separately) may use generic quantity stock.
6. All product and unit images are uploaded to and served from Cloudinary CDN.
7. Staff accounts are created by the owner/admin; no public registration.
8. Maximum concurrent staff using the billing screen: 2–5 at any time.
9. Expected peak public traffic: ~500 concurrent visitors during promotions.
10. Internet access is available at the shop counter for the billing screen.
11. The shop's WhatsApp number is stored in system configuration and used for
    all public contact CTAs.
12. IMEI numbers are stored in the system but are never displayed publicly.
13. Battery health percentage display on the public website is configurable
    by the owner (default: off).

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
| Database        | PostgreSQL (Neon)            | ACID transactions — mandatory for billing and unit status integrity             |
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
- **MongoDB**: No ACID transactions — disqualified for unit-level inventory integrity.
- **Firebase**: Not suitable for relational inventory + billing records.
- **Supabase as backend**: Considered; Neon + Prisma gives more control and is simpler.
- **Remix**: Strong alternative but Next.js has superior Vercel integration and ecosystem.
- **MySQL/PlanetScale**: PostgreSQL preferred for JSON support, full-text search, and row locking.

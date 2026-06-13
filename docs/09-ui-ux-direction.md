# UI/UX Direction

---

## Design Principles

1. **Trust through professionalism.** The public site must look like a
   credible, established phone shop — not a listing board. Clean layout,
   consistent typography, real product images, clear pricing by unit.

2. **Drive contact, not cart.** Every product page ends with a WhatsApp or
   phone call CTA. The site has no cart, no checkout, no payment flow. The
   goal of every public interaction is to bring the customer through the door
   or on the phone.

3. **Show what makes each phone different.** Grade, storage, color, accessories
   included, warranty — these are the details that matter to a used phone buyer.
   Display them clearly per unit.

4. **Mobile-first public site.** Customers browse on phones. Every public page
   must be excellent on mobile before desktop.

5. **Desktop-first admin and billing.** Counter staff use these on PCs.
   Optimize for minimal clicks, dense information, and fast operation.

6. **No ambiguity in admin.** Every unit has a visible status badge. Every
   product has a clear visibility indicator. Admin users know the state of
   every item at a glance.

---

## Design System

### Color Palette

| Token              | Value       | Usage                                      |
|--------------------|-------------|---------------------------------------------|
| `--primary`        | `#0F172A`   | Dark navy — headings, primary buttons       |
| `--accent`         | `#3B82F6`   | Blue — links, active states, CTAs           |
| `--whatsapp`       | `#25D366`   | WhatsApp green — WhatsApp buttons only      |
| `--success`        | `#22C55E`   | Available, published, confirmed             |
| `--warning`        | `#F59E0B`   | Low units, in repair, draft                 |
| `--destructive`    | `#EF4444`   | Defective, deleted, error                   |
| `--sold`           | `#64748B`   | Sold units (muted, not prominent)           |
| `--neutral-50`     | `#F8FAFC`   | Page backgrounds                            |
| `--neutral-100`    | `#F1F5F9`   | Card backgrounds                            |
| `--neutral-500`    | `#64748B`   | Secondary text                              |
| `--neutral-900`    | `#0F172A`   | Primary text                                |

### Typography
- **Headings**: Inter, semi-bold to bold, tight tracking.
- **Body**: Inter, regular, 16px base, relaxed line-height.
- **Prices/SKUs**: JetBrains Mono or system mono.

### Border Radius: Cards `rounded-xl`, Buttons `rounded-lg`, Inputs `rounded-md`, Badges `rounded-full`.

### Grade Badge Colors
| Grade | Color      |
|-------|------------|
| S     | `#6366F1` purple |
| A+    | `#22C55E` green  |
| A     | `#3B82F6` blue   |
| B     | `#F59E0B` amber  |
| C     | `#F97316` orange |

---

## Public Storefront Pages

### Homepage (`/`)
[Fixed Navbar: Logo | "Used Mobile" | Nav links | Search | Call Now button]
[Hero Section: Full width]

Headline: "Quality Used Phones in Hyderabad"

Sub: "Browse our inventory online. Call or WhatsApp to enquire. Visit us to buy."

[WhatsApp Us] [Browse Phones] — prominent CTAs
[How It Works Strip: 3–4 steps]

Browse Our Inventory  2. Contact Us  3. Visit The Store  4. Purchase

[Featured Phones: "Currently Available" — 4-column grid, scroll on mobile]
[Browse by Category: Category image cards]
[Top Brands: Horizontally scrollable logo strip]
[Shop Info Section]

Address: [Full address]

Phone: [phone number] | WhatsApp: [number]

Hours: (if applicable)

[Embedded map or link to Google Maps]
[Footer: Links, address, social if any]

---

### Product Catalog (`/products`)
[Navbar]

[Header: "Available Phones" | X phones found]

[Mobile: Filter toggle button at top]

[Desktop: Sidebar filters + main content]
Sidebar filters:

Category (checkboxes)
Brand (checkboxes, top 8 shown, "Show more" toggle)
Condition (checkboxes: Like New, Good, Fair, New)
Storage (checkboxes: 64GB, 128GB, 256GB, 512GB)
Price range (slider: ₹ min – ₹ max)

Main content:

Sort dropdown | Grid of ProductCards
ProductCard:

[Product image (primary)]

[Brand name — small, muted]

[Product name — bold]

[Condition badge: "Like New" / "Good" / etc.]

[Storage options: pill chips showing available storages]

[Price: "From ₹X,XXX"]

[Unit count: "X Available" in green badge]
[Pagination at bottom]

---

### Product Detail (`/products/[slug]`)
[Navbar]

[Breadcrumb: Home → Category → Product name]
[Two-column on desktop, single column mobile]

LEFT: Image gallery

- Primary large image

- Thumbnail row (click to switch)
RIGHT: Product summary

- Brand name (small, linked to brand page)

- Product name (h1, large)

- Description (short paragraph)

- Starting price: "From ₹X,XXX" (large, bold)

- [X units available] badge (green)

- If 0 units: "Currently Out of Stock" (gray badge)
--- Contact CTAs (sticky on mobile, inline on desktop) ---
[WhatsApp Us]  ← green WhatsApp brand button, full width on mobile
[Call Now]     ← outlined button with phone icon
---
[Specifications Section]

Key-value table from product.specifications JSON:

| Display       | 6.1 inch OLED |

| Processor     | A15 Bionic    |

| Network       | 5G            |

| Dual SIM      | Yes           |
[Available Units Section]

Section title: "Units Available (X)"

Grid of Unit Cards (2 columns on desktop, 1 on mobile):
Unit Card:

[Grade badge: A+] [Condition: Like New]

[Storage: 128GB]  [Color: Midnight Black]

Accessories: [✓ Box] [✓ Charger] [✗ Earphones]

[Battery: 89%]  ← shown only if show_battery_health_public = true

[₹16,500] (large, bold)

[WhatsApp About This Unit] ← pre-fills message with unit details

[Call About This Unit]
If 0 units available:

"All units currently sold. Contact us to check on availability."

[WhatsApp Us] [Call Now]
[Product Description (full)]
[Related Products: "You Might Also Like" — 4-column grid]

[Footer]

### WhatsApp Button Behavior

Two types of WhatsApp CTA:
1. **Product-level**: "WhatsApp Us About This Phone"
   Pre-filled message: "Hi, I'm interested in the {product_name}. What's available?"

2. **Unit-level**: "WhatsApp About This Unit"
   Pre-filled message: "Hi, I'm interested in the {product_name} — Grade {grade},
   {storage}, {color}, ₹{price}. Is it still available?"

Link format: `https://wa.me/{whatsapp_number}?text={encodeURIComponent(message)}`

Both link to `system_config.whatsapp_number`.

### Floating WhatsApp Button (All Pages)
A fixed floating button in the bottom-right corner of every public page:
- WhatsApp icon in brand green (`#25D366`)
- Links to shop WhatsApp with a generic "Hi, I'd like to know more about your phones."
- Visible on all public pages; hidden in admin and billing panels.

---

## Admin Panel UI

### Layout
[Top bar: Logo | "Used Mobile Admin" | User name/role | Logout]

[Left sidebar: Dark navy background]

Dashboard
Products

└ All Products

└ Add Product
Phone Units

└ All Units
Categories
Brands
Bills & Sales
Reports
Users
Audit Log
Settings (SUPER_ADMIN only)

[Main content area: white background]


### Product List Table
Columns:

[Thumb] | [Name + SKU] | [Brand] | [Category] | [Available Units] |

[Starting Price] | [Listed Toggle] | [Visibility Badge] | [Actions]
Visibility badges:

"Published"   → green  (listed + has available units)

"Out of Stock" → amber (listed + 0 units, no override)

"Override"    → purple (listed + 0 units + override active)

"Draft"       → gray   (not listed)

"Deleted"     → red    (soft deleted)

### Phone Unit Table (within product or standalone)
Columns:

[Unit SKU] | [Grade] | [Storage] | [Color] | [Condition] |

[Box] | [Charger] | [Battery] | [Price] | [Status] | [Actions]
Status badges:

"Available"  → green

"Sold"       → muted gray

"In Repair"  → amber

"Defective"  → red

### Phone Unit Form
Tabs: Basic Info | Accessories & Extras | Pricing | Admin Notes
Basic Info:

Unit SKU (auto-filled or manual)
IMEI (optional, marked "Private — never shown publicly")
Storage selector (64GB / 128GB / 256GB / 512GB / Other)
Color input
Condition selector
Grade selector (visual buttons: S / A+ / A / B / C with color indicators)
Battery health slider (0–100%)

Accessories:

Has Original Box (toggle)
Has Charger (toggle)
Has Earphones (toggle)
Has Original Accessories (toggle)
Warranty info (text: e.g., "30 days store warranty")

Pricing:

Selling Price (leave blank to use product base price)
Purchase Price (admin-only, shown with a lock icon)

Admin Notes:

Internal notes textarea


---

## Billing Screen (Staff Panel)
[Fixed top bar: "New Bill" | Staff: [name] | [time]]
[Two-panel layout]
RIGHT PANEL (~60%): Product + Unit Search

[Search input — auto-focused, large, prominent]

[Search results: product cards]
Product Card in Search Results:
  [Thumb] [Name] [Brand] [X units available]
  [v Expand to see units]

Expanded Unit List:
  Unit Row:
    [Grade badge] [Storage] [Color] [Has Box icon] [Has Charger icon]
    [₹Price] [+ Add to Bill]
  (All AVAILABLE units shown, other statuses greyed out)
LEFT PANEL (~40%): Bill Summary

Bill Items:

Each item row: [Unit SKU] [Grade/Storage/Color] [₹Price] [Discount input] [× Remove]

(For generic accessories: quantity controls shown)
Subtotal line
Bill Discount input (₹)
Total (large, bold, prominent)

Payment Method (4 buttons): Cash | Card | Transfer | Other

Customer Name (optional)
Customer Phone (optional)
Notes (optional)

[CREATE BILL] — large, full width, primary color

### Billing UX Rules
- Search input auto-focuses on page load and after each successful bill.
- The "+ Add" button on a unit must be large enough to tap on a touchscreen monitor.
- Once a unit is added to the bill, it is visually greyed out in the search
  results with a "Added to Bill" badge — but it is NOT removed from the system
  until the bill is confirmed.
- If a unit becomes SOLD (by another terminal) between the time it appears in
  search and the bill is submitted, the bill is rejected with a clear error
  identifying which unit is no longer available.

---

## Receipt Print Layout
[Shop Name: Used Mobile]

[Address: Hyder Manzil, 7 Tombs Rd...]

[Phone: +91 XXXXXXXX]
[SALE RECEIPT]

[Bill No: BILL-20240615-0012]

[Date: 15 June 2024]

[Staff: Ahmed]

[Payment: Cash]
[Line items:]

iPhone 12                     ₹16,500

Grade A | 128GB | Black

Box ✓  Charger ✓

30 days warranty

(Discount: ₹500)           -₹500

---------

Samsung Galaxy A54            ₹8,200

Grade B | 128GB | Blue

──────────────────────────────────

SUBTOTAL                    ₹24,700

DISCOUNT                      -₹500

TOTAL                       ₹24,200

[Payment: Cash]

──────────────────────────────────

Thank you for shopping at Used Mobile!

Note: IMEI is NOT printed on the customer receipt. It is stored internally only.

---

## Key UX Rules

1. All form submissions show a loading state on the submit button.
2. Successful operations show a toast notification (top-right, auto-dismiss 3s).
3. Destructive actions require a confirmation dialog.
4. All tables support keyboard navigation.
5. Empty states are always instructive.
6. Pagination is present when results exceed the page size.
7. All filter/sort state is URL-based (shareable, bookmarkable).
8. The floating WhatsApp button appears on all public pages.
9. On mobile, admin panel degrades gracefully. Billing screen requires desktop/tablet.
10. WhatsApp buttons use `#25D366` exclusively to leverage brand recognition.

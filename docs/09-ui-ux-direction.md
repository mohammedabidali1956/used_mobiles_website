# docs/09-UI-UX-DIRECTION.md

# UI/UX Direction

---

## Design Principles

1. **Trust through professionalism.** The public site must feel like a premium
   electronics retailer, not a local classifieds page. Clean layout, high-quality
   product images, clear pricing.

2. **Speed over decoration.** No animation for its own sake. Every interaction
   must feel instant. Transitions are subtle (< 200ms).

3. **Mobile-first public site.** Most browsing happens on phones. The public
   site must be excellent on mobile before being optimized for desktop.

4. **Desktop-first admin and billing.** Staff use these on counter PCs.
   Optimize for keyboard navigation, dense information display, and minimal
   click paths.

5. **No ambiguity.** Every status (listed/unlisted, in stock/out of stock,
   deleted) has a clear visual indicator. Admin users must always know the
   state of every product at a glance.

---

## Design System

### Color Palette

| Token            | Value       | Usage                                   |
|------------------|-------------|------------------------------------------|
| `--primary`      | `#0F172A`   | Dark navy — headings, primary buttons    |
| `--accent`       | `#3B82F6`   | Blue — links, active states, CTAs        |
| `--success`      | `#22C55E`   | In stock, published, confirmed           |
| `--warning`      | `#F59E0B`   | Low stock, draft, pending                |
| `--destructive`  | `#EF4444`   | Out of stock, deleted, error             |
| `--neutral-50`   | `#F8FAFC`   | Page backgrounds                         |
| `--neutral-100`  | `#F1F5F9`   | Card backgrounds, table alternating rows |
| `--neutral-500`  | `#64748B`   | Secondary text, placeholders             |
| `--neutral-900`  | `#0F172A`   | Primary text                             |
| `--white`        | `#FFFFFF`   | Card surfaces, modal backgrounds         |

### Typography

- **Headings**: Inter (or Geist), semi-bold to bold, tight tracking.
- **Body**: Inter, regular weight, 16px base, relaxed line-height.
- **Mono** (prices, SKUs, bill numbers): JetBrains Mono or system mono.
- Type scale: 12/14/16/18/20/24/30/36/48px.

### Spacing
Tailwind's default 4px grid. All spacing in multiples of 4.
Card padding: 24px (p-6). Section gaps: 32–48px.

### Border Radius
- Cards/panels: `rounded-xl` (12px).
- Buttons: `rounded-lg` (8px).
- Inputs: `rounded-md` (6px).
- Chips/badges: `rounded-full`.

### Shadows
- Cards: `shadow-sm` (subtle, not heavy).
- Modals: `shadow-2xl`.
- Dropdowns: `shadow-lg`.

---

## Public Storefront Pages

### Homepage (`/`)
[Fixed Navbar: Logo | Nav links | Search bar | (Login link subtle)]

[Hero: Full-width banner, headline, CTA button "Browse Phones"]

[Featured Products: Section title + 4-column grid (scroll on mobile)]

[Shop by Category: 3-4 category cards with images]

[Top Brands: Brand logo strip, horizontally scrollable on mobile]

[Recently Listed: 4-column product grid]

[Footer: Shop info, links, social icons]

### Product Catalog (`/products`)
[Navbar]

[Page header: "All Phones" + result count]

[Layout: sidebar filters (desktop) / top filter drawer (mobile)]

Sidebar: Category tree, Brand checklist, Condition checkboxes, Price range

[Main content: Sort dropdown + Product grid (2 cols mobile, 4 cols desktop)]

[Pagination controls at bottom]

[Footer]

### Product Detail (`/products/[slug]`)
[Navbar]

[Breadcrumb: Home > Category > Product name]

[Two-column layout on desktop, single column on mobile]

Left: Image gallery (primary + thumbnails)

Right:

Brand name (small, linked)

Product name (h1, large)

Condition badge (e.g., "Like New")

Price (large, bold) — Compare-at price struck through if set

Stock status badge ("In Stock" / "Out of Stock")

[Variant selector if variants exist: color/storage chips]

[Description (expandable if long)]

[Specifications table: key/value pairs from specifications JSON]

[Related Products: "You Might Also Like" — 4-column grid]

[Footer]

### Search Results (`/search?q=...`)
[Navbar with search bar pre-filled]

[Results header: 'X results for "query"']

[Product grid (same as catalog) with active filters strip]

[Empty state: "No phones found for..." + suggestions]

---

## Admin Panel UI

### Layout
[Top bar: Logo | Page title | User menu (name, role, logout)]

[Left sidebar: Navigation links, collapsible on narrow screens]

Dashboard
Products (expanded: All Products, Add New)
Categories
Brands
Stock Management
Bills
Reports
Users
Audit Log
Settings (SUPER_ADMIN only)

[Main content area]


### Admin Color Overrides
Admin uses a slightly different neutral palette (white/gray) to distinguish it
visually from the public site. The sidebar uses `--primary` dark navy as its
background with white text.

### Product List Table
Columns: [Thumbnail 40px] [Name + SKU] [Brand] [Category] [Condition]

[Price] [Stock] [Listed toggle] [Visibility badge] [Actions: Edit, Delete]

Status badges:

Listed, In Stock → green badge "Published"
Listed, Zero Stock → yellow badge "Out of Stock"
Unlisted → gray badge "Draft"
Deleted → red badge "Deleted"
visibility_override → purple badge "Override"


### Product Form
- Sticky "Save" button area at bottom.
- Form is divided into tabs or sections: Basic Info | Images | Variants | Pricing & Stock | Visibility | Advanced.
- Live slug preview as name is typed.
- Image uploader with drag-and-drop, reorder handles, primary selector.

### Billing Screen Layout (Optimized for Speed)
[Fixed top bar: "New Bill" title | Staff name | Time]

[Two-panel layout]

LEFT PANEL (bill summary, ~40% width):

- Bill items list: name, quantity controls (- qty +), unit price, line total, delete row

- Subtotal line

- Bill discount input

- Total (large, bold)

- Payment method selector (4 buttons: Cash / Card / Transfer / Other)

- Customer name input (optional)

- Customer phone input (optional)

- Notes input (optional)

- [CREATE BILL] button — large, primary color, full width

RIGHT PANEL (product search, ~60% width):

- Search input (auto-focused on page load)

- Search results list:

[Thumbnail] [Name] [Condition] [Stock: X left] [Price] [+ Add button]

- Zero-stock items shown disabled with "Out of Stock" label

The search input must be auto-focused on page load and after each bill creation.
The "+ Add" button on a search result must be large enough to tap accurately
on a touchscreen counter monitor.

---

## Key UX Rules

1. All form submissions show a loading state on the submit button.
2. Successful operations show a toast notification (top-right, auto-dismiss 3s).
3. Destructive actions (delete, deactivate) require a confirmation dialog.
4. All tables support keyboard navigation.
5. Empty states are always instructive (not just "No data").
6. Pagination is always present when results could exceed the page size.
7. All filter/sort state is in the URL (shareable, bookmarkable, browser-back works).
8. On mobile, the admin panel degrades gracefully to stacked layouts.
   The billing screen requires desktop or tablet.
# Functional Requirements

All requirements in this document are binding for v1 unless explicitly marked
`[v2]`. Requirements marked `[v2]` are documented for architecture awareness
but are not built in the initial release.

There is no cart, checkout, online payment, shipping, or delivery in this
system. The public website is a browse-and-contact platform. All sales are
completed in person at the shop counter.

---

## Module 1: Public Storefront

### FR-PUB-01 — Homepage
- Display a hero section with the shop name, tagline, and city, plus a prominent
  WhatsApp CTA button and a "Call Now" link.
- Include a "How It Works" strip: Browse Online → Contact Us → Visit Store → Purchase.
- Display featured products (flagged `is_featured = true`), showing starting price
  and available unit count.
- Display product categories with images and links.
- Display top brands with logos.
- Show shop address and contact information in the footer and/or a dedicated section.
- All contact CTAs (WhatsApp, phone) must link to the numbers stored in system config.

### FR-PUB-02 — Product Catalog Page
- Display all publicly visible products in a grid layout.
- Each product card shows: primary image, product name, brand, condition range
  (e.g., "Good to Like New"), starting price ("From ₹X"), and available unit count.
- Support pagination (default: 24 products per page).
- Support URL-based filter state so filtered URLs are shareable and bookmarkable.
- Filters available: Category (multi-select), Brand (multi-select), Condition
  (New / Like New / Good / Fair), Price range (min/max slider), Storage (multi-select
  derived from available units).
- Sort options: Newest first, Price low to high, Price high to low, Name A–Z.
- Show total count of results above the grid.
- When no results match, display a helpful empty state with a clear filters button.
- No add-to-cart, no wishlist, no quantity selectors on the catalog page.

### FR-PUB-03 — Product Detail Page
- Display product name, brand, category, description, and all product images
  in a scrollable gallery.
- Show a summary section: starting price, total available units, condition range.
- Show a prominent WhatsApp CTA button: "WhatsApp Us About This Phone" — pre-fills
  a WhatsApp message with the product name and a link or description.
- Show a "Call Now" button linking to the shop phone number.
- Display the product description and a specifications table (key-value pairs
  from the `specifications` JSONB field).
- Display an **Available Units** section listing each publicly visible unit as
  a card. Each unit card shows:
  - Grade badge (e.g., Grade A, Grade B)
  - Storage and Color
  - Condition label (Like New, Good, etc.)
  - Accessories included icons: ✓ Box, ✓ Charger, ✓ Earphones
  - Battery health percentage (shown only if `show_battery_health_public = true`
    in system config)
  - Selling price for that specific unit
  - A "WhatsApp About This Unit" button (pre-fills message with unit-specific
    details: grade, storage, color, price)
- IMEI is never displayed publicly under any configuration.
- If all units are sold, show an "Out of Stock" notice. WhatsApp/call CTAs
  remain visible so customers can ask about restocking.
- Show related products (same brand or same category, up to 4).
- Page metadata (title, description, canonical URL) must be dynamically generated
  for SEO.

### FR-PUB-04 — Category Pages
- Display all publicly visible products within a selected category.
- Apply the same filtering and sorting as the main catalog.
- Show the category name, description, and image at the top.

### FR-PUB-05 — Brand Pages
- Display all publicly visible products for a selected brand.
- Apply the same filtering and sorting as the main catalog.
- Show the brand name and logo at the top.

### FR-PUB-06 — Search
- Full-text search across product name, brand name, category name, and SKU.
- Search is triggered on Enter or after a short debounce in the search input.
- Search results are paginated.
- Search query is preserved in the URL (`?q=`).
- Search returns only publicly visible products with at least one available unit.

### FR-PUB-07 — Contact Page (Optional, v1)
- A simple static page showing the shop address, phone number, WhatsApp link,
  and an embedded Google Map of the shop location.
- No contact form required in v1.

### FR-PUB-08 — General
- All public pages must be server-side rendered or ISR for SEO.
- All public pages must include correct Open Graph meta tags.
- The site must function without JavaScript for core browsing; filtering may
  use client-side JavaScript for UX enhancement.
- A sitemap.xml must be generated and accessible at /sitemap.xml.
- A robots.txt must be present at /robots.txt.
- The shop's WhatsApp number and phone number are stored in system_config and
  referenced site-wide. Changing them in system_config updates all CTAs.

---

## Module 2: Authentication

### FR-AUTH-01 — Login
- A single `/login` page accepts email and password for all internal users
  (STAFF, ADMIN, SUPER_ADMIN).
- No public registration flow.
- After successful login, redirect STAFF to `/billing`, ADMIN to `/admin`.
- Failed login shows a generic error ("Invalid credentials").
- After 5 consecutive failed attempts from one IP, lock for 15 minutes.

### FR-AUTH-02 — Logout
- A logout button is available in the navigation of all authenticated screens.
- Logout destroys the session and redirects to the login page.

### FR-AUTH-03 — Protected Routes
- All `/admin/*` routes require ADMIN or SUPER_ADMIN role.
- All `/billing/*` routes require STAFF, ADMIN, or SUPER_ADMIN role.
- Unauthorized access redirects to `/login` with a return URL.

---

## Module 3: Admin Dashboard

### FR-ADMIN-01 — Dashboard Overview
- Show key metrics: total products, total listed products, total available units,
  units sold today, revenue today, low stock alerts (products with fewer than
  the configured threshold of available units).
- Show a recent activity feed (last 10 audit events).
- Show quick action links: Add Product, Add Unit, View Bills, View Reports.

### FR-ADMIN-02 — Product Management: List
- Show all products (including hidden and soft-deleted) in a table.
- Columns: Image thumbnail, Name, Brand, Category, Starting Price, Available Units,
  Listed toggle, Visibility status, Actions.
- Filter by: Brand, Category, Condition, Listed status, Stock status, Deleted status.
- Search by name or SKU.
- Sortable by: Name, Price, Available Units, Created date.
- Pagination: 50 per page.
- Bulk actions: Bulk list/unlist, bulk soft delete.

### FR-ADMIN-03 — Product Management: Create
- Form with all product fields: name, brand, category, condition, base price,
  compare-at price, cost price, description, specifications (dynamic key-value),
  is_featured, is_unit_tracked flag.
- Image upload: upload multiple images to Cloudinary; drag to reorder; mark
  one as primary.
- Specification fields: dynamic key-value pairs (e.g., Display: 6.1 inch OLED,
  Processor: A15 Bionic, Network: 5G).
- Save as Draft (is_listed = false) or Publish (is_listed = true).
- After creating a product, admin is prompted to add the first phone unit.

### FR-ADMIN-04 — Product Management: Edit
- Same form as Create, pre-populated with existing data.
- Ability to upload, delete, and reorder images.
- Collapsible sections: Phone Units list, Stock movement history, Bill history.
- "Danger Zone" section for soft delete and hard delete (SUPER_ADMIN only).

### FR-ADMIN-05 — Product Visibility Controls
- Toggle `is_listed` (manual listing control) independently of unit availability.
- Toggle `visibility_override` (force show on public site even at zero available units).
- Display the computed public visibility status: "Publicly Visible" / "Hidden".
- Explanation shown next to the status: e.g., "Hidden — no units available" or
  "Hidden — manually unlisted".

### FR-ADMIN-06 — Phone Unit Management: List
- Accessible from within each product's detail page (collapsible section) and
  from a standalone page at `/admin/units`.
- Columns: Unit SKU, Grade, Storage, Color, Condition, Has Box, Has Charger,
  Battery Health, Selling Price, Status badge, Added date, Actions.
- Filter by: Status (Available, Sold, In Repair, Defective), Grade, Storage.
- Search by unit SKU or IMEI (IMEI search is admin-only).

### FR-ADMIN-07 — Phone Unit Management: Add Unit
- Form fields:
  - Product (select from product list)
  - Unit SKU (auto-generated or manual entry)
  - IMEI (optional, stored securely)
  - Storage (e.g., 64GB, 128GB, 256GB)
  - Color
  - Condition (NEW / LIKE_NEW / GOOD / FAIR)
  - Grade (S / A+ / A / B / C)
  - Battery health percentage (optional)
  - Has box (checkbox)
  - Has charger (checkbox)
  - Has earphones (checkbox)
  - Has original accessories (checkbox)
  - Warranty info (text, e.g., "30 days store warranty")
  - Selling price (leave blank to use product base price)
  - Purchase price (admin-only cost)
  - Admin notes (internal, never shown publicly)
- On save: unit is created with status = AVAILABLE, product's available_unit_count
  is incremented, StockMovement record is created.

### FR-ADMIN-08 — Phone Unit Management: Edit
- Same form as Add Unit, pre-populated.
- Cannot edit IMEI after creation (must go through SUPER_ADMIN hard-edit path).
- Can change status manually: AVAILABLE → IN_REPAIR → AVAILABLE → DEFECTIVE.
- Cannot manually set status to SOLD (that is done through billing only).
- Any status change from AVAILABLE creates a StockMovement and audit log entry.

### FR-ADMIN-09 — Category Management
- Create, edit, delete categories.
- Categories support one level of nesting (parent → sub-category).
- Each category has: name, slug, description, image, sort order, is_active.
- Deleting a category with active products is blocked.

### FR-ADMIN-10 — Brand Management
- Create, edit, delete brands.
- Each brand has: name, slug, logo image, is_active.
- Deleting a brand with active products is blocked.

### FR-ADMIN-11 — User Management
- Create STAFF accounts (ADMIN).
- Create ADMIN accounts (SUPER_ADMIN only).
- Edit name and email of any account below the current user's role.
- Deactivate/reactivate accounts.
- View last login timestamp.
- Cannot delete accounts — only deactivate.

### FR-ADMIN-12 — Bills and Sales Records
- View all bills in a table: bill number, staff member, date, total, item count.
- Filter by date range and staff member.
- Click any bill to view full detail with all items (including unit SKU, grade,
  storage, color for each sold unit).
- Export bills list as CSV.

### FR-ADMIN-13 — Reports
- Sales summary: total revenue and bill count by day, week, or month.
- Top selling products: ranked by units sold.
- Unit status report: count by status (Available, Sold, In Repair, Defective)
  per product.
- Low availability alert: products with fewer than threshold available units.
- All reports exportable as CSV.

### FR-ADMIN-14 — Audit Log Viewer
- Paginated table of all audit events (newest first).
- Columns: Timestamp, User, Action, Entity Type, Entity ID, Summary.
- Filter by: user, action type, entity type, date range.
- Expand any row to see old/new data diff.
- Audit log is read-only.

### FR-ADMIN-15 — System Configuration
- SUPER_ADMIN can edit key-value system config entries via a settings UI.
- Editable fields include: shop name, shop address, phone number, WhatsApp
  number, currency symbol, low availability threshold, receipt footer text,
  show_battery_health_public toggle.

---

## Module 4: Staff Billing Panel

### FR-BILL-01 — Billing Screen Layout
- A single-page application-style interface (no full page reloads during billing).
- Left panel (~40%): bill items, discount input, total, payment method.
- Right panel (~60%): product search and unit selection.

### FR-BILL-02 — Product Search for Billing
- Real-time search as staff types (debounced 300ms).
- Search by product name, SKU, or unit SKU (for barcode-scan workflows).
- Results show product cards: image, name, brand, available unit count, starting price.
- Clicking a product card expands it to show individual available units.
- Each unit row shows: grade, storage, color, has_box, has_charger, selling price.
- Units with status ≠ AVAILABLE are shown greyed out and cannot be selected.
- Clicking an AVAILABLE unit adds it to the bill.

### FR-BILL-03 — Bill Item Management
- Each bill item represents one specific phone unit (or one generic accessory line).
- For unit-tracked items: quantity is always 1; quantity controls are not shown.
- For generic-stock items (accessories): quantity increase/decrease controls are shown.
- Remove individual items from the bill.
- Apply a per-item discount (optional, fixed amount).
- Bill item displays: unit SKU, grade, storage, color, price.

### FR-BILL-04 — Bill Summary
- Show: itemized list, subtotal, total discount, final total.
- Payment method selector: Cash, Card, Transfer, Other.
- Optional customer name and phone number fields.
- Optional notes field.
- A bill-level discount can also be applied (fixed amount).

### FR-BILL-05 — Bill Confirmation
- "Create Bill" button submits the bill.
- System validates each phone unit's status is AVAILABLE immediately before commit.
- If any unit is no longer AVAILABLE (race condition), the bill is rejected with
  a clear message identifying which unit is unavailable.
- On success: phone unit status changes to SOLD, bill is saved, receipt appears.

### FR-BILL-06 — Receipt
- After bill creation, display a clean receipt view.
- Show: bill number, date, shop name, shop address, staff name, payment method.
- For each line item: product name, unit SKU, grade, storage, color,
  accessories note, unit price, discount, line total.
- Print button (browser print, styled for receipt paper).
- IMEI is NOT shown on the customer receipt. It is stored internally only.
- "New Bill" button to clear and start fresh.
- Option to view previous bill.

### FR-BILL-07 — Bill History (Staff)
- Staff can view their own bills from any date.
- Each bill can be opened to display the receipt.
- No editing of completed bills.

---

## Module 5: Inventory Management

### FR-INV-01 — Unit Sale (Automatic)
- When a bill is created and confirmed, all billed phone units have their
  status set to SOLD within a single database transaction.
- Simultaneously, the parent product's `available_unit_count` is decremented.
- If any unit is not AVAILABLE at the moment of commit, the entire bill
  transaction is rolled back.

### FR-INV-02 — Stock Movement Records
- Every unit status change (sale, return, repair, defect, restock) creates a
  StockMovement record with: type, unit status before/after, reference, user,
  timestamp.
- StockMovement records are append-only.

### FR-INV-03 — Auto-Hide at Zero Available Units
- When a product has zero AVAILABLE units (and visibility_override = false),
  it is automatically excluded from all public queries.
- This is enforced at the query level, not by updating a flag.

### FR-INV-04 — Adding New Units (Restock)
- Admin adds a new phone unit via FR-ADMIN-07.
- Each new unit created with status = AVAILABLE automatically increases the
  product's publicly visible presence.
- Creates a StockMovement with type UNIT_ADDED.

### FR-INV-05 — Unit Status Management
- Admin can manually change unit status (AVAILABLE → IN_REPAIR, IN_REPAIR →
  AVAILABLE, AVAILABLE → DEFECTIVE, DEFECTIVE → AVAILABLE).
- Status change to/from AVAILABLE triggers a recalculation of the product's
  available_unit_count.
- Each status change creates a StockMovement and audit log entry.

# docs/03-FUNCTIONAL-REQUIREMENTS.md

# Functional Requirements

All requirements in this document are binding for v1 unless explicitly marked
`[v2]`. Requirements marked `[v2]` are documented here for architecture
awareness but are not built in the initial release.

---

## Module 1: Public Storefront

### FR-PUB-01 — Homepage
- Display a hero section with promotional content (configurable by admin).
- Display featured products (products flagged `is_featured = true`).
- Display product categories with images.
- Display top brands with logos.
- Link to full catalog, individual category pages, and individual brand pages.

### FR-PUB-02 — Product Catalog Page
- Display all publicly visible products in a grid layout.
- Support pagination (default: 24 products per page).
- Support URL-based filter state so filtered URLs are shareable and bookmarkable.
- Filters available: Category (multi-select), Brand (multi-select), Condition
  (New / Like New / Good / Fair), Price range (min/max slider).
- Sort options: Newest first, Price low to high, Price high to low, Name A–Z.
- Show total count of results above the grid.
- When no results match, display a helpful empty state with a clear filters button.

### FR-PUB-03 — Product Detail Page
- Display product name, brand, category, condition, description, price,
  compare-at price (if set, shown as strikethrough), and all images in a gallery.
- Display the primary product image prominently with thumbnail navigation.
- Display a stock status indicator: "In Stock" or "Out of Stock".
- Do NOT display the exact stock quantity to public visitors.
- Display product specifications as a key-value table (storage, color, condition
  details, etc. from the `specifications` JSON field).
- Show related products (same brand or same category, up to 4).
- Page metadata (title, description, canonical URL) must be dynamically generated
  for SEO.

### FR-PUB-04 — Category Pages
- Display all products within a selected category.
- Apply the same filtering and sorting as the main catalog.
- Show the category name, description, and image at the top.

### FR-PUB-05 — Brand Pages
- Display all products for a selected brand.
- Apply the same filtering and sorting as the main catalog.
- Show the brand name and logo at the top.

### FR-PUB-06 — Search
- Full-text search across product name, brand name, category name, and SKU.
- Search is triggered on Enter or after a short debounce in the search input.
- Search results are paginated.
- Search query is preserved in the URL (`?q=`).
- Search returns only publicly visible products.

### FR-PUB-07 — General
- All public pages must be server-side rendered for SEO.
- All public pages must include correct Open Graph meta tags.
- The site must function without JavaScript (core browsing); filtering may use
  client-side JavaScript for UX enhancement.
- A sitemap.xml must be generated and accessible at /sitemap.xml.
- A robots.txt must be present at /robots.txt.

---

## Module 2: Authentication

### FR-AUTH-01 — Login
- A single `/login` page accepts email and password for all internal users
  (STAFF, ADMIN, SUPER_ADMIN).
- No public registration flow.
- After successful login, redirect STAFF to `/billing`, ADMIN to `/admin`.
- Failed login shows a generic error ("Invalid credentials") — do not specify
  whether email or password was wrong.
- After 5 consecutive failed attempts from one IP, lock the attempt for 15 minutes.
  (Implement via rate limiting middleware.)

### FR-AUTH-02 — Logout
- A logout button is available in the navigation of all authenticated screens.
- Logout destroys the session and redirects to the login page.

### FR-AUTH-03 — Protected Routes
- All `/admin/*` routes require ADMIN or SUPER_ADMIN role.
- All `/billing/*` routes require STAFF, ADMIN, or SUPER_ADMIN role.
- Unauthorized access to protected routes redirects to `/login` with a return URL.

---

## Module 3: Admin Dashboard

### FR-ADMIN-01 — Dashboard Overview
- Show key metrics: total products, total listed products, low stock alerts
  (configurable threshold, default: ≤ 3 units), total bills today, revenue today.
- Show a recent activity feed (last 10 audit events).
- Show quick action links to common tasks.

### FR-ADMIN-02 — Product Management: List
- Show all products (including hidden and soft-deleted) in a table.
- Columns: Image thumbnail, Name, SKU, Brand, Category, Condition, Price,
  Stock, Listed (toggle), Visibility status, Actions.
- Filter by: Brand, Category, Condition, Listed status, Stock status, Deleted status.
- Search by name or SKU.
- Sortable by: Name, Price, Stock, Created date.
- Pagination: 50 per page.
- Bulk actions: Bulk list/unlist, bulk delete (soft).

### FR-ADMIN-03 — Product Management: Create
- Form with all product fields (see Data Model).
- Image upload: upload multiple images to Cloudinary; drag to reorder; mark one as primary.
- Specification fields: dynamic key-value pairs (e.g., Storage: 128GB, Color: Black).
- Variant creation: add variants with their own SKU, price, stock, color, and storage.
- Save as Draft (is_listed = false) or Publish (is_listed = true) buttons.
- Slug is auto-generated from the name but manually editable.

### FR-ADMIN-04 — Product Management: Edit
- Same form as Create, pre-populated with existing data.
- Ability to upload additional images, delete existing images, reorder images.
- Show stock movement history for this product in a collapsible section.
- Show which bills included this product in a collapsible section.
- "Danger Zone" section for soft delete and hard delete (SUPER_ADMIN only).

### FR-ADMIN-05 — Product Visibility Controls
- Toggle `is_listed` (manual listing control) independently of stock.
- Toggle `visibility_override` (force show on public site even at zero stock).
- See the computed public visibility status clearly: "Publicly Visible" / "Hidden".
- Explanation is shown next to the status: why the product is or isn't visible.

### FR-ADMIN-06 — Category Management
- Create, edit, delete categories.
- Categories support one level of nesting (parent category → sub-category).
- Each category has: name, slug, description, image, sort order, is_active.
- Deleting a category with active products is blocked (admin must reassign products first).

### FR-ADMIN-07 — Brand Management
- Create, edit, delete brands.
- Each brand has: name, slug, logo image, is_active.
- Deleting a brand with active products is blocked.

### FR-ADMIN-08 — User Management
- Create STAFF accounts (ADMIN).
- Create ADMIN accounts (SUPER_ADMIN only).
- Edit name and email of any account below the current user's role.
- Deactivate/reactivate accounts.
- View last login timestamp.
- Cannot delete accounts — only deactivate (preserves audit trail).

### FR-ADMIN-09 — Stock Management
- View current stock levels for all products in a table.
- Manually adjust stock: add or subtract quantity, with mandatory reason entry.
  This creates a StockMovement record with type `MANUAL_ADJUSTMENT`.
- Filter products by stock level (zero stock, low stock, in stock).
- Export stock report as CSV.

### FR-ADMIN-10 — Bills and Sales Records
- View all bills in a table with: bill number, staff member, date, total, item count.
- Filter by date range and staff member.
- Click any bill to view full bill detail with all items.
- Export bills list as CSV (date range selectable).

### FR-ADMIN-11 — Reports
- Sales summary: total revenue and bill count by day, week, or month (chart + table).
- Top selling products: ranked by units sold and revenue.
- Stock movement history: all movements with type, quantity, reference.
- Low stock alert list: all products at or below threshold.
- All reports exportable as CSV.

### FR-ADMIN-12 — Audit Log Viewer
- Paginated table of all audit events (newest first).
- Columns: Timestamp, User, Action, Entity Type, Entity ID, Summary.
- Filter by: user, action type, entity type, date range.
- Click any row to expand and see full old/new data diff.
- Audit log is read-only — no deletion.

---

## Module 4: Staff Billing Panel

### FR-BILL-01 — Billing Screen Layout
- A single-page application-style interface (no full page reloads during billing).
- Left/main panel: bill items list, subtotal, discount input, total, payment method selector.
- Right/side panel: product search and quick-add.

### FR-BILL-02 — Product Search for Billing
- Real-time search as staff types (debounced 300ms).
- Search by product name, SKU, or barcode (if barcode is stored in SKU field).
- Results show: product image thumbnail, name, condition, price, available stock.
- Products with zero stock are shown but disabled (cannot be added to bill).
- Clicking a result adds it to the bill with quantity 1.

### FR-BILL-03 — Bill Item Management
- Increase/decrease quantity of each item in the bill.
- Quantity cannot exceed available stock (validated on both UI and server).
- Remove individual items from the bill.
- Apply a per-item discount (optional, as a fixed amount or percentage).

### FR-BILL-04 — Bill Summary
- Show: itemized list, subtotal, total discount, final total.
- Payment method selector: Cash, Card, Transfer, Other.
- Optional customer name and phone number fields.
- Optional notes field.
- A bill-level discount can also be applied (fixed amount).

### FR-BILL-05 — Bill Confirmation
- "Create Bill" button submits the bill.
- System validates all quantities against live stock before committing.
- If stock is insufficient for any item (race condition), system rejects and
  shows which items are now unavailable.
- On success: stock is decremented atomically, bill is saved, receipt screen appears.

### FR-BILL-06 — Receipt
- After bill creation, display a clean receipt view.
- Show: bill number, date, items, quantities, unit prices, line totals, payment method,
  staff name, shop name and address.
- Print button (browser print, styled for receipt paper).
- "New Bill" button to clear and start fresh.
- Link to view previous bill.

### FR-BILL-07 — Bill History (Staff)
- Staff can view their own bills from the current shift or any date.
- Each bill can be opened to display the receipt.
- No editing of completed bills.

---

## Module 5: Inventory Management (Automated)

### FR-INV-01 — Automatic Decrement
- When a bill is created and confirmed, all product quantities are decremented
  by the billed quantity within a single database transaction.
- If any decrement would result in negative stock, the entire bill transaction
  is rolled back.

### FR-INV-02 — Stock Movement Records
- Every stock change (billing, manual adjustment, restock) creates a
  StockMovement record with: type, quantity change, before/after quantity,
  reference (bill ID or manual), created by, timestamp.
- This is immutable — no updates or deletes on StockMovement records.

### FR-INV-03 — Auto-Hide at Zero Stock
- When a product's `stock_quantity` reaches 0 as a result of billing,
  the product is automatically no longer returned in public queries.
- This is enforced at the query level (WHERE stock_quantity > 0 OR
  visibility_override = true), not by updating a flag.

### FR-INV-04 — Manual Restock
- Admin can add stock to any product via the Stock Management screen.
- Requires entering: quantity to add and reason.
- Creates a StockMovement record with type `RESTOCK`.
- Product becomes publicly visible again automatically if is_listed = true.
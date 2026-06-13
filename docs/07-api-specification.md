# API Specification

All API routes are prefixed with `/api`. All responses are JSON. Authenticated
routes return `401` if no session exists and `403` if role is insufficient.

There are no cart, checkout, payment, or order tracking API routes in this system.
The public API is browse-only. All purchase transactions occur through the internal
billing panel.

---

## Standard Response Shapes

### Success
```json
{ "success": true, "data": { } }
```

### Paginated Success
```json
{
  "success": true,
  "data": [ ],
  "pagination": { "page": 1, "pageSize": 24, "total": 150, "totalPages": 7 }
}
```

### Error
```json
{
  "success": false,
  "error": { "code": "PRODUCT_NOT_FOUND", "message": "..." }
}
```

---

## Public APIs (No Authentication Required)

### GET /api/products
Returns publicly visible products.

Query params:
- `page` (default: 1), `pageSize` (default: 24, max: 100)
- `category` (slug), `brand` (slug)
- `condition` (NEW | LIKE_NEW | GOOD | FAIR)
- `minPrice`, `maxPrice`
- `storage` (e.g., "128GB", multi-value: `storage=128GB&storage=256GB`)
- `sort` (newest | price_asc | price_desc | name_asc)

Response fields per product: id, slug, name, brand name, category name,
base_condition, base_price, compare_at_price, available_unit_count, primary
image URL, is_unit_tracked.

Never returns: purchase_price for any unit, internal_notes, imei, admin_notes.

Visibility filter applied:
deleted_at IS NULL

AND is_listed = true

AND (

(is_unit_tracked = true  AND available_unit_count > 0)

OR (is_unit_tracked = false AND stock_quantity > 0)

OR visibility_override = true

)
---

### GET /api/products/[slug]
Returns a single publicly visible product by slug.
Returns 404 if the product is not publicly visible.

Includes:
- All product fields (no internal_notes, no unit purchase_price)
- All images sorted by sort_order
- Brand name and slug
- Category name and slug
- Specifications JSONB
- Related products (up to 4, same brand or category)
- Available units (see below)

**Available units** embedded in response:
Each unit in the `units` array includes: id, sku, grade, storage, color,
condition, has_box, has_charger, has_earphones, has_original_accessories,
warranty_info, selling_price (or product base_price if null), and
battery_health (only if system_config `show_battery_health_public = true`).

IMEI is **never** included in the public units response, regardless of
configuration.

---

### GET /api/products/[slug]/units
Returns all AVAILABLE units for a product, with the same field set as the
units embedded in the product detail response. Used for dynamic refresh of
unit availability on the public product detail page.

---

### GET /api/categories
Returns all active categories (not deleted, is_active = true).
Nested: top-level categories with their child categories.

---

### GET /api/brands
Returns all active brands (not deleted, is_active = true).

---

### GET /api/search
Query params: `q` (min 2 chars), `page`, `pageSize`.
Full-text search on product name, brand name, category name.
Applies same public visibility filter as GET /api/products.
Response: same product list shape as GET /api/products.

---

## Admin APIs (Require ADMIN or SUPER_ADMIN)

### Products

#### GET /api/admin/products
All products including hidden and soft-deleted.
Filters: `isListed`, `isDeleted`, `hasZeroUnits`, `brand`, `category`.
Returns admin-level fields including internal_notes.
Does not return unit IMEI or purchase_price in the list view.

#### POST /api/admin/products
Create a new product.
Body: full product schema (name, brand_id, category_id, base_condition,
base_price, compare_at_price, description, specifications, is_unit_tracked,
is_featured, internal_notes).
Returns created product. Writes PRODUCT_CREATED audit event.

#### GET /api/admin/products/[id]
Full product record including: internal_notes, all images, unit count by status,
recent stock movements, recent bills.
Does not return individual unit IMEI in this response (use unit endpoints).

#### PUT /api/admin/products/[id]
Update product. Validates version for optimistic locking.
Writes PRODUCT_UPDATED audit event.

#### DELETE /api/admin/products/[id]
Soft delete (sets deleted_at). Writes PRODUCT_DELETED audit event.
`?hard=true` (SUPER_ADMIN only): blocked if any bills reference this product's units.

#### PATCH /api/admin/products/[id]/visibility
Body: `{ is_listed?: boolean, visibility_override?: boolean }`.
Triggers `revalidatePath` for public pages.
Writes PRODUCT_VISIBILITY_CHANGED audit event.

#### POST /api/admin/products/[id]/images
Add image (from Cloudinary upload result).

#### DELETE /api/admin/products/[id]/images/[imageId]
Delete image record and call Cloudinary delete API.

#### PATCH /api/admin/products/[id]/images/reorder
Body: `{ imageIds: string[] }`.

---

### Phone Units

#### GET /api/admin/products/[id]/units
Returns all phone units for a specific product.
Fields include: all unit fields including imei, purchase_price, admin_notes.
Filterable by: status, grade, storage.

#### POST /api/admin/products/[id]/units
Add a new phone unit.
Body: sku (optional, auto-generated if absent), imei, storage, color,
battery_health, grade, condition, has_box, has_charger, has_earphones,
has_original_accessories, warranty_info, selling_price, purchase_price,
admin_notes.

On success:
1. Creates phone_unit with status = AVAILABLE.
2. Increments product.available_unit_count within a transaction.
3. Creates StockMovement (type: UNIT_ADDED).
4. Writes UNIT_ADDED audit event.
5. Calls revalidatePath for affected public pages.

Returns the created unit.

#### GET /api/admin/units/[unitId]
Get a specific phone unit with all fields including imei and purchase_price.
Requires ADMIN or SUPER_ADMIN.

#### PUT /api/admin/units/[unitId]
Update unit details (all fields except status and imei).
IMEI can only be changed by SUPER_ADMIN via a separate confirmed endpoint.
Writes UNIT_UPDATED audit event.

#### PATCH /api/admin/units/[unitId]/status
Change unit status.
Body: `{ status: 'AVAILABLE' | 'IN_REPAIR' | 'DEFECTIVE', reason: string }`.
Cannot set status to SOLD through this endpoint (billing only).
If status changes to or from AVAILABLE:
1. Adjusts product.available_unit_count.
2. Triggers public page revalidation.
3. Creates StockMovement (type: UNIT_STATUS_CHANGED).
4. Writes UNIT_STATUS_CHANGED audit event.

#### GET /api/admin/units
Cross-product unit search.
Query params: `q` (search sku or imei), `status`, `productId`, `grade`,
`storage`, `page`, `pageSize`.

---

### Categories

#### GET /api/admin/categories — all (including inactive/deleted)
#### POST /api/admin/categories — create
#### PUT /api/admin/categories/[id] — update
#### DELETE /api/admin/categories/[id] — soft delete (blocked if products exist)

---

### Brands

#### GET /api/admin/brands — all
#### POST /api/admin/brands — create
#### PUT /api/admin/brands/[id] — update
#### DELETE /api/admin/brands/[id] — soft delete (blocked if products exist)

---

### Users

#### GET /api/admin/users — list, role filter
#### POST /api/admin/users — create STAFF (ADMIN) or ADMIN (SUPER_ADMIN)
#### PUT /api/admin/users/[id] — update name/email
#### PATCH /api/admin/users/[id]/status — activate/deactivate

---

### Bills

#### GET /api/admin/bills — all bills, paginated, filterable by date/staff
#### GET /api/admin/bills/[id]
Full bill with all items. Items include unit_sku, unit_grade, unit_storage,
unit_color. IMEI in bill_items is returned only to ADMIN and SUPER_ADMIN in
this detail view, never to STAFF.

---

### Reports

#### GET /api/admin/reports/sales?from=&to=&groupBy=day|week|month
#### GET /api/admin/reports/top-products?from=&to=&limit=10
#### GET /api/admin/reports/unit-status
Returns count of units by status, grouped by product.

#### GET /api/admin/reports/low-availability?threshold=2
Products with available_unit_count ≤ threshold.

All report endpoints support `?format=csv`.

---

### System Settings

#### GET /api/admin/settings — SUPER_ADMIN only; returns all system_config entries
#### PATCH /api/admin/settings — SUPER_ADMIN only; update one or more keys

---

### Audit Logs

#### GET /api/admin/audit-logs
Paginated. Filterable by user, action, entity_type, date range.

---

## Staff/Billing APIs (Require STAFF, ADMIN, or SUPER_ADMIN)

### GET /api/billing/products/search
Query params: `q` (min 2 chars), `limit` (default 10).

Returns matching products (including unlisted ones — staff can bill any
product regardless of public listing status). For each product:
- Product info: id, name, sku, brand, base_price, primary_image_url
- `available_units`: list of AVAILABLE units for that product, each with:
  sku, grade, storage, color, condition, has_box, has_charger, has_earphones,
  selling_price, battery_health (always returned to staff regardless of public config)
- Never returns: imei, purchase_price, admin_notes

This endpoint allows the billing panel to do a single search and immediately
show available units without a second round trip.

---

### POST /api/billing/bills
Create a bill and atomically change unit statuses to SOLD.
Full transaction behavior documented in `docs/08-PRODUCT-INVENTORY-LOGIC.md`.

Body schema:
```json
{
  "items": [
    {
      "productId": "uuid",
      "phoneUnitId": "uuid",
      "unitPrice": 15000,
      "discount": 0
    },
    {
      "productId": "uuid-accessory",
      "phoneUnitId": null,
      "quantity": 2,
      "unitPrice": 500,
      "discount": 0
    }
  ],
  "discount": 0,
  "paymentMethod": "CASH",
  "customerName": "optional",
  "customerPhone": "optional",
  "notes": "optional"
}
```

Returns: created bill with all items and unit details.

---

### GET /api/billing/bills
Bills created by the current authenticated staff member.
Query params: `from`, `to`, `page`, `pageSize`.

### GET /api/billing/bills/[id]
Full bill detail. Staff can only access their own bills. ADMIN can access any.
Returns unit details on each item (grade, storage, color). Does not return IMEI
to STAFF role.

---

## Error Codes Reference

| Code                     | HTTP | Meaning                                           |
|--------------------------|------|---------------------------------------------------|
| VALIDATION_ERROR         | 400  | Zod validation failed; `details` field added      |
| UNAUTHORIZED             | 401  | No valid session                                  |
| FORBIDDEN                | 403  | Role insufficient                                 |
| NOT_FOUND                | 404  | Entity not found                                  |
| CONFLICT                 | 409  | Slug exists, optimistic lock conflict             |
| UNIT_NOT_AVAILABLE       | 409  | Unit is no longer AVAILABLE at time of billing    |
| INSUFFICIENT_STOCK       | 409  | Generic product stock insufficient (non-unit)     |
| CATEGORY_HAS_PRODUCTS    | 409  | Cannot delete category with active products       |
| INVALID_STATUS_TRANSITION| 422  | Unit status change not permitted                  |
| INTERNAL_ERROR           | 500  | Unexpected server error (logged to Sentry)        |
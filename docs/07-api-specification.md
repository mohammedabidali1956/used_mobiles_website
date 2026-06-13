# docs/07-API-SPECIFICATION.md

# API Specification

All API routes are prefixed with `/api`. All responses are JSON. All
authenticated routes return `401` if no session exists and `403` if the
session role is insufficient.

## Standard Response Shapes

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Success
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 24,
    "total": 150,
    "totalPages": 7
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "No product with the given identifier was found."
  }
}
```

---

## Public APIs (No Auth Required)

### GET /api/products
Returns publicly visible products.

Query params:
- `page` (default: 1), `pageSize` (default: 24, max: 100)
- `category` (slug), `brand` (slug)
- `condition` (NEW | LIKE_NEW | GOOD | FAIR)
- `minPrice`, `maxPrice`
- `sort` (newest | price_asc | price_desc | name_asc)

Response: Paginated list of products (public fields only; no cost_price,
no internal_notes, no deleted products, no unlisted products, no zero-stock
products unless visibility_override is true).

---

### GET /api/products/[slug]
Returns a single publicly visible product by slug.

Returns 404 if product is not publicly visible (not listed, zero stock without
override, deleted, or slug not found).

Includes: all images (sorted by sort_order), brand name, category name,
specifications JSON, related products (up to 4, same brand or category).

---

### GET /api/categories
Returns all active categories (not deleted, is_active = true).
Nested structure: top-level categories with their children.

---

### GET /api/brands
Returns all active brands (not deleted, is_active = true).

---

### GET /api/search
Query params: `q` (search string), `page`, `pageSize`.
Full-text search on product name, SKU, brand name, category name.
Applies same public visibility filter as GET /api/products.

---

## Admin APIs (Require ADMIN or SUPER_ADMIN role)

### Products

#### GET /api/admin/products
All products including hidden and soft-deleted. Supports same filters as
public API plus: `isListed`, `isDeleted`, `hasZeroStock`.

#### POST /api/admin/products
Create a new product. Body: full product schema (see schemas/product.schema.ts).
Returns created product. Writes PRODUCT_CREATED audit event.

#### GET /api/admin/products/[id]
Full product record including admin-only fields (cost_price, internal_notes,
stock_movements list, bills list).

#### PUT /api/admin/products/[id]
Update a product. Partial updates supported. Validates version field for
optimistic locking. Returns updated product. Writes PRODUCT_UPDATED audit event.

#### DELETE /api/admin/products/[id]
Soft deletes the product (sets deleted_at). Writes PRODUCT_DELETED audit event.
Use `?hard=true` query param (SUPER_ADMIN only) for permanent deletion.

#### POST /api/admin/products/[id]/images
Multipart form or JSON with Cloudinary upload result. Adds image record.

#### DELETE /api/admin/products/[id]/images/[imageId]
Removes image record. Also calls Cloudinary delete API for the file.

#### PATCH /api/admin/products/[id]/images/reorder
Body: `{ imageIds: string[] }` — reorders images by the provided array order.

#### PATCH /api/admin/products/[id]/visibility
Body: `{ is_listed?: boolean, visibility_override?: boolean }`.
Writes PRODUCT_VISIBILITY_CHANGED audit event.

### Categories

#### GET /api/admin/categories — all (including inactive/deleted)
#### POST /api/admin/categories — create
#### PUT /api/admin/categories/[id] — update
#### DELETE /api/admin/categories/[id] — soft delete (blocked if products exist)

### Brands

#### GET /api/admin/brands — all
#### POST /api/admin/brands — create
#### PUT /api/admin/brands/[id] — update
#### DELETE /api/admin/brands/[id] — soft delete (blocked if products exist)

### Users

#### GET /api/admin/users — list all users (role filter supported)
#### POST /api/admin/users — create STAFF (ADMIN) or ADMIN (SUPER_ADMIN)
#### PUT /api/admin/users/[id] — update name/email; SUPER_ADMIN can change role
#### PATCH /api/admin/users/[id]/status — activate/deactivate

### Bills

#### GET /api/admin/bills — all bills, paginated, filterable by date/staff
#### GET /api/admin/bills/[id] — full bill with all items

### Stock

#### GET /api/admin/stock — stock levels for all products
#### POST /api/admin/stock/adjust
Body: `{ productId, variantId?, quantityChange, reason }`.
Requires `reason` text. Creates StockMovement. Writes STOCK_ADJUSTED audit event.

### Reports

#### GET /api/admin/reports/sales?from=&to=&groupBy=day|week|month
#### GET /api/admin/reports/top-products?from=&to=&limit=10
#### GET /api/admin/reports/stock-movements?from=&to=&productId?
#### GET /api/admin/reports/low-stock?threshold=3

All report endpoints support `?format=csv` to return a CSV download.

### Audit Logs

#### GET /api/admin/audit-logs
Paginated. Filterable by: user, action, entity_type, date range.

---

## Staff/Billing APIs (Require STAFF, ADMIN, or SUPER_ADMIN role)

### GET /api/billing/products/search
Query params: `q` (string, min 2 chars), `limit` (default 10).
Returns products matching query with real-time stock levels.
Returns only non-deleted products (including unlisted ones, for billing).
Includes variant information.

### POST /api/billing/bills
Create a bill and atomically decrement stock.
Body schema: see `schemas/bill.schema.ts`.
Transaction behavior: see `docs/08-PRODUCT-INVENTORY-LOGIC.md`.
Returns: created bill with items.

### GET /api/billing/bills
Bills created by the current authenticated staff member.
Query params: `from`, `to`, `page`, `pageSize`.

### GET /api/billing/bills/[id]
Full bill detail. Staff can only access their own bills; ADMIN can access any.

---

## Error Codes Reference

| Code                          | HTTP | Meaning                                       |
|-------------------------------|------|-----------------------------------------------|
| VALIDATION_ERROR              | 400  | Zod validation failed; `details` field added  |
| UNAUTHORIZED                  | 401  | No valid session                              |
| FORBIDDEN                     | 403  | Session exists but role insufficient          |
| NOT_FOUND                     | 404  | Entity not found                              |
| CONFLICT                      | 409  | Slug already exists, optimistic lock conflict |
| INSUFFICIENT_STOCK            | 409  | Bill rejected due to stock shortage           |
| CATEGORY_HAS_PRODUCTS         | 409  | Cannot delete category with products          |
| INTERNAL_ERROR                | 500  | Unexpected server error (logged to Sentry)    |
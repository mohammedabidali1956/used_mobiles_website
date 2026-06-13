# docs/08-PRODUCT-INVENTORY-LOGIC.md

# Product and Inventory Logic

This document defines the core business rules governing product visibility,
stock management, and the billing transaction flow. These rules are the most
critical part of the system and must be implemented exactly as described.

---

## Product Visibility Decision Tree

A product is **publicly visible** (shown on the public website) when ALL of
the following conditions are simultaneously true:
deleted_at IS NULL           (product has not been soft or hard deleted)
is_listed = true             (admin has explicitly listed the product)
stock_quantity > 0           (product has available stock)

— OR —

visibility_override = true   (admin overrides zero-stock hiding)


Expressed as a single boolean:
publicly_visible =

(deleted_at IS NULL)

AND (is_listed = true)

AND (stock_quantity > 0 OR visibility_override = true)

### Visibility State Matrix

| is_listed | stock_quantity | visibility_override | deleted_at | Publicly Visible? |
|-----------|----------------|---------------------|------------|-------------------|
| true      | > 0            | any                 | NULL       | YES               |
| true      | 0              | false               | NULL       | NO (out of stock) |
| true      | 0              | true                | NULL       | YES (override)    |
| false     | any            | any                 | NULL       | NO (unlisted)     |
| any       | any            | any                 | NOT NULL   | NO (deleted)      |

### Why This Is Query-Based, Not Flag-Based

The visibility is computed from the combination of fields in every query —
it is not stored as a single `is_public` boolean. This prevents the following
class of bugs:
- Admin marks product as listed, forgets stock is zero, product appears publicly
  but cannot actually be sold.
- Billing reduces stock to zero, flag-update step fails, product stays shown.

By computing visibility in the WHERE clause, the database is always consistent.

### The Public Catalog Query (Simplified)
```sql
SELECT *
FROM products
WHERE deleted_at IS NULL
  AND is_listed = true
  AND (stock_quantity > 0 OR visibility_override = true)
ORDER BY created_at DESC
LIMIT :pageSize OFFSET :offset;
```

---

## Stock Quantity Rules

1. `stock_quantity` is always ≥ 0 (enforced by DB CHECK constraint).
2. Stock can only be decreased through billing (SALE movement) or manual
   adjustment (MANUAL_ADJUSTMENT movement).
3. Stock can only be increased through manual restock (RESTOCK movement).
4. Every stock change produces a StockMovement record immediately.
5. StockMovement records are append-only — they are never updated or deleted.

### Variant Stock vs. Product Stock
- If a product has active variants, the product's `stock_quantity` represents
  the total stock across all variants. This total is maintained by the
  application when variants are created, updated, or sold.
- If a product has no variants, its `stock_quantity` is used directly.
- The billing screen shows per-variant stock when variants exist.

---

## Billing Transaction Flow

This is the most critical operation in the system. It must be atomic.

### Pre-Conditions
- Staff is authenticated (STAFF role or above).
- Bill has at least one item.
- Each item has quantity ≥ 1.
- Payment method is selected.

### Transaction Steps
BEGIN TRANSACTION

↓

Lock all product/variant rows involved in this bill

(SELECT ... FOR UPDATE on each product/variant in the bill items)

↓
Validate stock for each item:

for each item in bill.items:

available_stock = (product or variant).stock_quantity

if available_stock < item.quantity:

ROLLBACK

RETURN error: INSUFFICIENT_STOCK for item (productId, available_stock)

↓
All items validated. Proceed.

↓
Generate bill_number (BILL-YYYYMMDD-XXXX format, using a sequence or

counting today's bills +1)

↓
INSERT into bills (all bill header fields)

↓
For each item in bill.items:

a. INSERT into bill_items (denormalize product name and SKU at this moment)

b. UPDATE products SET

stock_quantity = stock_quantity - item.quantity,

version = version + 1,

updated_at = now()

WHERE id = item.productId AND version = :expectedVersion

(or update variant if variant_id is set)

c. INSERT into stock_movements (

type = 'SALE',

quantity_change = -item.quantity,

quantity_before = previous stock,

quantity_after = previous stock - item.quantity,

reference_type = 'BILL',

reference_id = bill.id

)

↓
INSERT into audit_logs (action = 'BILL_CREATED', entity_type = 'BILL',

entity_id = bill.id, user_id = staff.id)

↓

COMMIT TRANSACTION

↓
Trigger ISR revalidation for affected product pages (after commit)

(This is non-transactional — if it fails, the bill is still valid;

the ISR timer will catch the update anyway)


### Failure Scenarios and Handling

| Failure Point                   | Action                                                      |
|---------------------------------|-------------------------------------------------------------|
| Stock insufficient at step 2    | ROLLBACK; return INSUFFICIENT_STOCK error with details      |
| DB error during insert at step 5| ROLLBACK; return INTERNAL_ERROR; log to Sentry              |
| DB error during update at step 6| ROLLBACK; return INTERNAL_ERROR; log to Sentry              |
| Version mismatch (optimistic lock)| Caught as CONFLICT; retry once or surface to user         |
| ISR revalidation fails at step 8| Ignore; timer will update the page within revalidation window|

### Concurrency Safety

Two staff members may simultaneously attempt to bill the same product.
The `SELECT ... FOR UPDATE` at step 1 ensures:
- The second transaction blocks until the first completes.
- After the first commits, the second reads the updated stock.
- If the second transaction now finds insufficient stock, it rolls back safely.
- No phantom reads. No double-decrement.

PostgreSQL row-level locking with `FOR UPDATE` is the correct tool here.
Application-level optimistic locking (version field) is a secondary defense.

---

## Manual Stock Adjustment Flow

Admin opens Stock Management screen
Selects product (and variant if applicable)
Enters: quantity change (+/- integer) and reason text (mandatory)
Submits

↓

BEGIN TRANSACTION

a. Read current stock

b. Validate: new stock would not go negative

c. UPDATE products SET stock_quantity = stock_quantity + quantityChange

d. INSERT into stock_movements (type = 'MANUAL_ADJUSTMENT', ...)

e. INSERT into audit_logs (action = 'STOCK_ADJUSTED', ...)

COMMIT


---

## Soft Delete Flow

When an admin soft-deletes a product:
1. `deleted_at` is set to `now()`.
2. The product immediately disappears from all public queries.
3. The product remains visible in admin product list with a "Deleted" badge.
4. All bills containing this product remain intact (FK to products still valid).
5. Stock movements for this product remain intact.
6. The product can be restored by an admin (set deleted_at back to NULL).

When a SUPER_ADMIN hard-deletes a product:
1. Verify no bills reference this product. If bills exist, block hard delete.
2. Delete all product_images records (also delete files from Cloudinary).
3. Delete all product_variants records.
4. Delete all stock_movements records.
5. Delete the product record.
6. Write audit log entry.

Note: Hard delete of a product with billing history is permanently blocked —
billing records must be preserved for financial integrity.

---

## Product Listing and Unlisting

- Listing a product: set `is_listed = true`.
  The product becomes publicly visible if stock > 0 (or visibility_override = true).
- Unlisting a product: set `is_listed = false`.
  The product immediately disappears from all public queries.
  Stock is not affected. Existing bills are not affected.
- These are direct database toggles, not queued actions.
  Visibility change takes effect on the next public page request (within ISR window).
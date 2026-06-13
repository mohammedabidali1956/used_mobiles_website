# Product and Inventory Logic

This document defines the core business rules for product visibility, phone
unit lifecycle, and the billing transaction. These rules govern all inventory
decisions and must be implemented exactly as described.

---

## Inventory Model: Unit-Level Tracking

Used phones are unique items. Each phone is a `phone_unit` with its own identity.
The inventory system tracks each unit individually through its lifecycle:
UNIT CREATED (status = AVAILABLE)

↓

Unit is publicly visible (as part of its parent product)

↓

Staff selects unit in billing panel → bill created → status = SOLD

↓

Unit is permanently sold (not reusable unless reversed by SUPER_ADMIN)

Alternative paths:
AVAILABLE → IN_REPAIR  (admin action — unit taken for repair)

IN_REPAIR → AVAILABLE  (admin action — repair complete)

AVAILABLE → DEFECTIVE  (admin action — unit found defective)

DEFECTIVE → AVAILABLE  (admin action — unit repaired or re-graded)

No path leads back from SOLD through the standard application UI. Reversals
(e.g., customer returns) are a v2 feature.

Generic accessories and non-unit-tracked products use the traditional
`stock_quantity` approach from the original design.

---

## Product Visibility Decision

A product is **publicly visible** when ALL of the following are true:
deleted_at IS NULL

AND is_listed = true

AND (

CASE

WHEN is_unit_tracked = true THEN available_unit_count > 0

WHEN is_unit_tracked = false THEN stock_quantity > 0

END

OR visibility_override = true

)

### Visibility State Examples

| is_listed | is_unit_tracked | available_unit_count | visibility_override | deleted_at | Visible? |
|-----------|-----------------|----------------------|---------------------|------------|----------|
| true      | true            | 3                    | false               | NULL       | YES      |
| true      | true            | 0                    | false               | NULL       | NO       |
| true      | true            | 0                    | true                | NULL       | YES (override) |
| false     | any             | any                  | any                 | NULL       | NO (unlisted) |
| any       | any             | any                  | any                 | NOT NULL   | NO (deleted)  |
| true      | false           | —                    | false               | NULL       | YES (if stock_quantity > 0) |

### Why available_unit_count Is Maintained, Not Computed

`available_unit_count` on the products table is maintained by the application
(incremented/decremented within transactions) rather than computed at query time.
This avoids an expensive subquery (`SELECT COUNT(*) FROM phone_units WHERE ...`)
on every public catalog query. The tradeoff is that this count must be kept in
sync through careful transactional discipline — every status change that adds or
removes a unit from the AVAILABLE pool must update this count in the same
transaction.

If drift is detected (count does not match actual available units), an admin
reconciliation endpoint can recompute it: `POST /api/admin/products/[id]/reconcile-count`.

---

## Billing Transaction Flow (Unit-Tracked Products)

This is the most critical operation in the system. It is atomic.

### Pre-Conditions
- Staff is authenticated (STAFF role or above).
- Bill has at least one item.
- Each unit-tracked item references a specific `phone_unit_id`.
- Payment method is selected.

### Transaction Steps
BEGIN TRANSACTION

↓

For each unit-tracked item in the bill:

Lock the phone_unit row:

SELECT id, status FROM phone_units WHERE id = $unitId FOR UPDATE

↓

2. Validate each locked unit:

if unit.status ≠ 'AVAILABLE':

ROLLBACK

RETURN error: UNIT_NOT_AVAILABLE { unitId, unitSku, currentStatus }
↓

3. For each generic (non-unit-tracked) item:

Lock the product row:

SELECT id, stock_quantity FROM products WHERE id = $productId FOR UPDATE

if product.stock_quantity < item.quantity:

ROLLBACK

RETURN error: INSUFFICIENT_STOCK { productId, available }
↓

4. All validations passed. Proceed.
↓

5. Generate bill_number (BILL-YYYYMMDD-XXXX, counting today's bills +1)
↓

6. INSERT into bills (header fields)
↓

7. For each unit-tracked item:

a. Snapshot unit fields at this moment:

grade, storage, color, condition, has_box, has_charger,

has_earphones, selling_price, imei (for internal record)

b. INSERT into bill_items with all denormalized unit fields

c. UPDATE phone_units SET status = 'SOLD', updated_at = now()

WHERE id = unitId AND status = 'AVAILABLE'

d. UPDATE products SET available_unit_count = available_unit_count - 1,

version = version + 1, updated_at = now()

WHERE id = productId

e. INSERT into stock_movements (type = 'UNIT_SOLD',

quantity_change = -1, unit_status_before = 'AVAILABLE',

unit_status_after = 'SOLD', reference_type = 'BILL',

reference_id = bill.id)
↓

8. For each generic item:

a. INSERT into bill_items (product_name, product_sku denormalized)

b. UPDATE products SET stock_quantity = stock_quantity - item.quantity

c. INSERT into stock_movements (type = 'GENERIC_SALE', ...)
↓

9. INSERT into audit_logs (action = 'BILL_CREATED', entity_type = 'BILL',

entity_id = bill.id)
↓

COMMIT TRANSACTION
↓

10. revalidatePath for all affected product public pages (post-commit,

non-transactional — failure here does not affect bill validity)

### Failure Handling

| Failure Point              | Action                                                     |
|----------------------------|------------------------------------------------------------|
| Unit not AVAILABLE (step 2)| ROLLBACK; return UNIT_NOT_AVAILABLE with unit details      |
| Generic stock low (step 3) | ROLLBACK; return INSUFFICIENT_STOCK with product details   |
| DB error at any step       | ROLLBACK; return INTERNAL_ERROR; log to Sentry             |

### Concurrency Safety

Two staff at two counter terminals may simultaneously attempt to bill the same
phone unit. The `SELECT ... FOR UPDATE` at step 1 ensures:
- The second transaction blocks until the first commits or rolls back.
- After the first commits (unit is now SOLD), the second reads status = SOLD.
- The second transaction fails validation at step 2 with UNIT_NOT_AVAILABLE.
- Staff receives a clear message and can remove the unavailable unit from the bill.

This is the correct behavior. One unit cannot be sold twice.

---

## Adding a New Phone Unit (Restock)
Admin opens "Add Unit" form

↓

Fills in: product, grade, storage, color, condition, accessories, price, etc.

↓

Submits

↓

BEGIN TRANSACTION

a. INSERT into phone_units (status = 'AVAILABLE')

b. UPDATE products SET available_unit_count = available_unit_count + 1,

version = version + 1

c. INSERT into stock_movements (type = 'UNIT_ADDED', quantity_change = +1,

unit_status_before = NULL, unit_status_after = 'AVAILABLE')

d. INSERT into audit_logs (action = 'UNIT_ADDED')

COMMIT

↓

revalidatePath for product public page

↓

Product becomes visible (or stays visible with one more unit)

---

## Unit Status Change (Admin Action)
Admin clicks "Mark as In Repair" on unit X

↓

BEGIN TRANSACTION

a. Validate: current status must be AVAILABLE (to go to IN_REPAIR)

b. UPDATE phone_units SET status = 'IN_REPAIR'

c. UPDATE products SET available_unit_count = available_unit_count - 1

(only if previous status was AVAILABLE)

d. INSERT into stock_movements (type = 'UNIT_STATUS_CHANGED', ...)

e. INSERT into audit_logs (action = 'UNIT_STATUS_CHANGED')

COMMIT

↓

If available_unit_count is now 0:

revalidatePath for product public page (will disappear from catalog)

---

## Generic Product Stock Management (Accessories)

For products with `is_unit_tracked = false`, the original quantity-based
approach applies:
- Stock increases through admin manual adjustment (GENERIC_RESTOCK).
- Stock decreases through billing (GENERIC_SALE).
- All changes are transactional and create StockMovement records.
- Public visibility: `stock_quantity > 0 OR visibility_override = true`.

---

## Product Listing and Unlisting

- **List a product**: `is_listed = true`. If units are AVAILABLE (or
  visibility_override = true), the product immediately appears publicly.
- **Unlist a product**: `is_listed = false`. Product immediately disappears
  from all public queries, regardless of how many units are AVAILABLE.
  Units are not affected; they retain their status.
- These are direct database toggles with immediate ISR revalidation.

---

## Soft Delete Flow

Soft-deleting a product:
1. Sets `deleted_at = now()`.
2. Product immediately excluded from all public queries.
3. Product visible in admin with "Deleted" badge.
4. All phone_units for this product retain their records and status.
5. All bills referencing this product's units remain intact.
6. Product can be restored (set deleted_at to NULL).

Hard delete (SUPER_ADMIN only):
- Blocked if any bill_items reference units of this product.
- If no billing history: delete product_images, phone_units, stock_movements,
  then the product. Also delete Cloudinary files.

---

## WhatsApp Deep Link Generation

The system uses WhatsApp deep links to enable customers to contact the shop
about a specific unit. The link is generated server-side (or client-side as
a utility) using the shop's WhatsApp number from system_config.

Link format:
https://wa.me/{whatsapp_number}?text={encoded_message}

Message template for a specific unit:
Hi, I'm interested in the {product_name} —

Grade {grade}, {storage}, {color}, ₹{selling_price}.

Is it still available?

Message template for a product (no specific unit):
Hi, I'm interested in the {product_name}.

Can you let me know what's available?

The `{whatsapp_number}` is read from `system_config.whatsapp_number` and
must be in the format `91XXXXXXXXXX` (no plus sign, no spaces).
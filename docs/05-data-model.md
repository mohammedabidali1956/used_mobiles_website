# Data Model

All tables use UUIDs as primary keys (PostgreSQL `uuid` type with
`gen_random_uuid()` as default). All timestamps are `timestamptz` stored in
UTC. Soft deletes use `deleted_at timestamptz NULL` (NULL = not deleted).

---

## Core Design Decision: Unit-Level Inventory

Used phones are not interchangeable units of the same product. Each handset
is a unique item with its own IMEI, battery health, grade, included accessories,
and condition. The data model reflects this:

- **Products** are display templates (e.g., "iPhone 12 128GB").
- **Phone Units** are individual handsets tied to a product template.
- The public website shows the product template with its available units.
- Internal billing and inventory operate at the phone unit level.

Generic stock products (accessories, cables, etc.) use the traditional
`stock_quantity` field on products and do not use phone units.

---

## Entity Relationship Summary
User ─────────────── creates ──────────── Bill

User ─────────────── creates ──────────── StockMovement

User ─────────────── creates ──────────── AuditLog

User ─────────────── creates ──────────── PhoneUnit
Brand ────────────── has many ──────────── Product

Category ─────────── has many ──────────── Product

Category ─────────── has parent ─────────── Category (self-ref)
Product ─────────── has many ──────────── ProductImage

Product ─────────── has many ──────────── PhoneUnit

Product ─────────── has many ──────────── BillItem

Product ─────────── has many ──────────── StockMovement
PhoneUnit ─────────── has many ──────────── BillItem (usually exactly one)

PhoneUnit ─────────── has many ──────────── StockMovement
Bill ─────────────── has many ──────────── BillItem
SystemConfig ──────── (singleton key-value table)
---

## Table Definitions

### users
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           TEXT NOT NULL UNIQUE
password_hash   TEXT NOT NULL
name            TEXT NOT NULL
role            TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','STAFF'))
is_active       BOOLEAN NOT NULL DEFAULT true
last_login_at   TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
created_by      UUID NULL REFERENCES users(id)
```
Notes: `password_hash` stores bcrypt output only. `created_by` is NULL for
the seed SUPER_ADMIN.

---

### categories
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
slug            TEXT NOT NULL UNIQUE
description     TEXT NULL
image_url       TEXT NULL
parent_id       UUID NULL REFERENCES categories(id)
sort_order      INTEGER NOT NULL DEFAULT 0
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at      TIMESTAMPTZ NULL
```
Index: `slug`, `parent_id`, `is_active`.

---

### brands
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
slug            TEXT NOT NULL UNIQUE
logo_url        TEXT NULL
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at      TIMESTAMPTZ NULL
```
Index: `slug`, `is_active`.

---

### products
```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
sku                   TEXT NOT NULL UNIQUE
name                  TEXT NOT NULL
slug                  TEXT NOT NULL UNIQUE
description           TEXT NULL
brand_id              UUID NOT NULL REFERENCES brands(id)
category_id           UUID NOT NULL REFERENCES categories(id)
base_condition        TEXT NOT NULL CHECK (base_condition IN ('NEW','LIKE_NEW','GOOD','FAIR'))
base_price            NUMERIC(10,2) NOT NULL
compare_at_price      NUMERIC(10,2) NULL
specifications        JSONB NOT NULL DEFAULT '{}'
is_unit_tracked       BOOLEAN NOT NULL DEFAULT true
available_unit_count  INTEGER NOT NULL DEFAULT 0 CHECK (available_unit_count >= 0)
stock_quantity        INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
is_listed             BOOLEAN NOT NULL DEFAULT false
visibility_override   BOOLEAN NOT NULL DEFAULT false
is_featured           BOOLEAN NOT NULL DEFAULT false
internal_notes        TEXT NULL
version               INTEGER NOT NULL DEFAULT 1
created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at            TIMESTAMPTZ NULL
created_by            UUID NOT NULL REFERENCES users(id)
updated_by            UUID NOT NULL REFERENCES users(id)
```

Notes:
- `is_unit_tracked = true` (default): Inventory is managed through `phone_units`.
  `available_unit_count` is the count of phone_units with status = 'AVAILABLE'
  for this product. Maintained within transactions; never manually edited.
- `is_unit_tracked = false`: Used for generic accessories. `stock_quantity` is
  manually managed by admin. `available_unit_count` is ignored.
- `base_price`: Starting/minimum price for display purposes. Individual units
  have their own `selling_price` which overrides this on the product detail page.
- `base_condition`: Representative condition for filtering. Individual units have
  their own condition.
- `specifications`: Structured product specs: `{"display": "6.1 inch OLED",
  "processor": "A15 Bionic", "network": "5G", "sim": "Dual SIM"}`.
- `internal_notes`: Admin-only. Never returned to public.
- `version`: Optimistic locking for concurrent admin edits.

Computed public visibility rule (applied in queries):
publicly_visible =

deleted_at IS NULL

AND is_listed = true

AND (

(is_unit_tracked = true  AND available_unit_count > 0)

OR

(is_unit_tracked = false AND stock_quantity > 0)

OR

visibility_override = true

)

Indexes:
- `(slug)`, `(sku)`, `(brand_id)`, `(category_id)`, `(is_listed)`, `(deleted_at)`
- `(available_unit_count)`, `(stock_quantity)`
- `(is_listed, deleted_at, available_unit_count)` composite for public catalog queries
- GIN index on `to_tsvector('english', name || ' ' || COALESCE(description, ''))`
  for full-text search (created via raw migration)

---

### phone_units
```sql
id                        UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id                UUID NOT NULL REFERENCES products(id)
sku                       TEXT NOT NULL UNIQUE
imei                      TEXT NULL
storage                   TEXT NULL
color                     TEXT NULL
battery_health            INTEGER NULL CHECK (battery_health BETWEEN 0 AND 100)
grade                     TEXT NULL CHECK (grade IN ('S','A+','A','B','C'))
condition                 TEXT NOT NULL CHECK (condition IN ('NEW','LIKE_NEW','GOOD','FAIR'))
has_box                   BOOLEAN NOT NULL DEFAULT false
has_charger               BOOLEAN NOT NULL DEFAULT false
has_earphones             BOOLEAN NOT NULL DEFAULT false
has_original_accessories  BOOLEAN NOT NULL DEFAULT false
warranty_info             TEXT NULL
selling_price             NUMERIC(10,2) NULL
purchase_price            NUMERIC(10,2) NULL
status                    TEXT NOT NULL DEFAULT 'AVAILABLE'
                          CHECK (status IN ('AVAILABLE','SOLD','IN_REPAIR','DEFECTIVE'))
admin_notes               TEXT NULL
created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
created_by                UUID NOT NULL REFERENCES users(id)
updated_by                UUID NOT NULL REFERENCES users(id)
```

Notes:
- `sku`: Unit-level SKU, auto-generated as `PU-YYYYMMDD-XXXX` or entered manually.
  This is used in billing search and receipts.
- `imei`: Optional. Stored securely. NEVER returned in any public API response.
  Never printed on customer receipts. Used internally for tracking and disputes.
- `battery_health`: Integer 0–100. Whether shown publicly is controlled by
  `show_battery_health_public` in system_config.
- `grade`: Quality grade assigned by the owner. S = like new, A+ = excellent,
  A = very good, B = good with minor marks, C = fair with visible wear.
- `selling_price`: If NULL, the parent product's `base_price` is used as the
  selling price for this unit.
- `purchase_price`: Admin-only cost of this unit. Never returned to public or staff.
- `status = 'AVAILABLE'`: Unit is in stock and can be added to a bill.
- `status = 'SOLD'`: Unit has been sold through the billing system. This status
  is set exclusively by the billing transaction — never manually.
- `status = 'IN_REPAIR'`: Unit is currently being repaired and cannot be sold.
- `status = 'DEFECTIVE'`: Unit is defective. Cannot be sold.

Status transition rules (enforced at application level):
- ANY → AVAILABLE: allowed by admin (except from SOLD)
- AVAILABLE → IN_REPAIR: allowed by admin
- AVAILABLE → DEFECTIVE: allowed by admin
- AVAILABLE → SOLD: allowed only through billing transaction
- SOLD → * : not allowed through UI (requires SUPER_ADMIN intervention)

Indexes:
- `(product_id)`, `(sku)`, `(status)`, `(product_id, status)` — critical for count queries
- `(imei)` — for admin IMEI lookup (partial index on non-null values)

---

### product_images
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
cloudinary_id   TEXT NOT NULL
url             TEXT NOT NULL
alt_text        TEXT NOT NULL DEFAULT ''
sort_order      INTEGER NOT NULL DEFAULT 0
is_primary      BOOLEAN NOT NULL DEFAULT false
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```
Index: `(product_id, sort_order)`, `(product_id, is_primary)`.

---

### bills
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_number     TEXT NOT NULL UNIQUE
staff_id        UUID NOT NULL REFERENCES users(id)
customer_name   TEXT NULL
customer_phone  TEXT NULL
subtotal        NUMERIC(10,2) NOT NULL
discount        NUMERIC(10,2) NOT NULL DEFAULT 0
total           NUMERIC(10,2) NOT NULL
payment_method  TEXT NOT NULL CHECK (payment_method IN ('CASH','CARD','TRANSFER','OTHER'))
notes           TEXT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```
Notes:
- `bill_number` format: `BILL-YYYYMMDD-XXXX`.
- Bills are immutable once created. No UPDATE after creation.
- Refunds and returns are a v2 feature.

Index: `(staff_id)`, `(created_at)`, `(bill_number)`.

---

### bill_items
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_id             UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE
product_id          UUID NOT NULL REFERENCES products(id)
phone_unit_id       UUID NULL REFERENCES phone_units(id)
quantity            INTEGER NOT NULL CHECK (quantity > 0)
unit_price          NUMERIC(10,2) NOT NULL
discount            NUMERIC(10,2) NOT NULL DEFAULT 0
line_total          NUMERIC(10,2) NOT NULL
-- Denormalized at billing time for immutable receipt records:
product_name        TEXT NOT NULL
product_sku         TEXT NOT NULL
unit_sku            TEXT NULL
unit_grade          TEXT NULL
unit_storage        TEXT NULL
unit_color          TEXT NULL
unit_condition      TEXT NULL
unit_has_box        BOOLEAN NULL
unit_has_charger    BOOLEAN NULL
unit_imei           TEXT NULL
```

Notes:
- `phone_unit_id`: Non-null for unit-tracked products. NULL for generic accessories.
- `quantity`: Always 1 for unit-tracked items. Can be > 1 for generic accessories.
- All `unit_*` columns are denormalized from the phone_unit record at the moment
  of billing. This preserves accurate receipt data even if the unit record is
  later edited.
- `unit_imei`: Denormalized and stored in the bill_item for internal record-keeping
  (warranty, dispute resolution). This field is never returned in any staff-facing
  or public API response. It is accessible only to ADMIN and SUPER_ADMIN in the
  bill detail view.

Index: `(bill_id)`, `(product_id)`, `(phone_unit_id)`.

---

### stock_movements
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id          UUID NOT NULL REFERENCES products(id)
phone_unit_id       UUID NULL REFERENCES phone_units(id)
movement_type       TEXT NOT NULL CHECK (movement_type IN (
                      'UNIT_ADDED',
                      'UNIT_SOLD',
                      'UNIT_STATUS_CHANGED',
                      'GENERIC_SALE',
                      'GENERIC_RESTOCK',
                      'GENERIC_ADJUSTMENT'
                    ))
quantity_change     INTEGER NOT NULL
quantity_before     INTEGER NOT NULL
quantity_after      INTEGER NOT NULL
unit_status_before  TEXT NULL
unit_status_after   TEXT NULL
reference_type      TEXT NULL
reference_id        UUID NULL
notes               TEXT NULL
created_by          UUID NOT NULL REFERENCES users(id)
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

Notes:
- This table is append-only. No updates or deletes ever.
- For unit-tracked products: `phone_unit_id` is always set. `quantity_change` is
  +1 (unit added or returned to AVAILABLE) or -1 (unit sold or removed from
  AVAILABLE). `unit_status_before` and `unit_status_after` capture the lifecycle.
- For generic products: `phone_unit_id` is NULL. `quantity_change` reflects the
  quantity delta on `stock_quantity`.
- `reference_type` / `reference_id`: For UNIT_SOLD and GENERIC_SALE, these point
  to the bills table.
- Movement types:
  - `UNIT_ADDED`: A new phone unit was created with status AVAILABLE.
  - `UNIT_SOLD`: A unit was sold through billing (status AVAILABLE → SOLD).
  - `UNIT_STATUS_CHANGED`: Admin changed unit status (e.g., AVAILABLE → IN_REPAIR).
  - `GENERIC_SALE`: A generic product (non-unit-tracked) was billed.
  - `GENERIC_RESTOCK`: Admin added generic product stock.
  - `GENERIC_ADJUSTMENT`: Admin manually adjusted generic product stock.

Index: `(product_id)`, `(phone_unit_id)`, `(created_at)`, `(movement_type)`.

---

### audit_logs
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES users(id)
action          TEXT NOT NULL
entity_type     TEXT NOT NULL
entity_id       UUID NULL
old_data        JSONB NULL
new_data        JSONB NULL
ip_address      INET NULL
user_agent      TEXT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```
Notes:
- Append-only. No updates or deletes.
- `action` examples: `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `UNIT_ADDED`,
  `UNIT_SOLD`, `UNIT_STATUS_CHANGED`, `BILL_CREATED`, `USER_CREATED`,
  `USER_DEACTIVATED`.
- Sensitive fields (`purchase_price`, `password_hash`, `imei`) are excluded
  from `old_data` and `new_data` snapshots.

Index: `(user_id)`, `(entity_type)`, `(entity_id)`, `(created_at)`.

---

### system_config
```sql
key             TEXT PRIMARY KEY
value           TEXT NOT NULL
description     TEXT NULL
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_by      UUID NULL REFERENCES users(id)
```

Seed data (initial values):
| Key                         | Default Value                                                        |
|-----------------------------|----------------------------------------------------------------------|
| `shop_name`                 | Used Mobile                                                          |
| `shop_address`              | Hyder Manzil, 7 Tombs Rd, beside Al Ameen Meat Mart, Samatha Colony, Bentoubavdi, Toli Chowki, Hyderabad, Telangana 500008 |
| `shop_phone`                | +91 XXXXXXXXXX                                                       |
| `whatsapp_number`           | 91XXXXXXXXXX (international format, no + or spaces)                  |
| `currency_symbol`           | ₹                                                                    |
| `low_availability_threshold`| 2                                                                    |
| `products_per_page`         | 24                                                                   |
| `receipt_footer_text`       | Thank you for shopping at Used Mobile!                               |
| `show_battery_health_public`| false                                                                |

Notes:
- `whatsapp_number` must be in the format `91XXXXXXXXXX` (country code + number,
  no plus sign, no spaces) so it can be used directly in WhatsApp deep links:
  `https://wa.me/{whatsapp_number}?text=...`
- `show_battery_health_public`: controls whether `battery_health` is visible on
  the public product detail page. IMEI is never shown publicly regardless of config.

---

## Prisma Schema Note
The above definitions map directly to the Prisma schema. Prisma model names
use PascalCase (User, Product, PhoneUnit, Bill, etc.). Tables use snake_case.
All models include `@@map("table_name")` decorators in the Prisma schema.
The `phone_units` table is the critical addition relative to a standard e-commerce
schema. All inventory queries and billing logic must be unit-aware.
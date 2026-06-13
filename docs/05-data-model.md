# docs/05-DATA-MODEL.md

# Data Model

All tables use UUIDs as primary keys (PostgreSQL `uuid` type with `gen_random_uuid()`
as default). All timestamps are `timestamptz` stored in UTC. Soft deletes use
`deleted_at timestamptz NULL` (NULL = not deleted).

---

## Entity Relationship Summary
User ─────────────── creates ──────────────── Bill

User ─────────────── creates ──────────────── StockMovement

User ─────────────── creates ──────────────── AuditLog
Brand ────────────── has many ──────────────── Product

Category ─────────── has many ──────────────── Product

Category ─────────── has parent ──────────────── Category (self-ref)
Product ─────────── has many ──────────────── ProductImage

Product ─────────── has many ──────────────── ProductVariant

Product ─────────── has many ──────────────── BillItem

Product ─────────── has many ──────────────── StockMovement
ProductVariant ──── has many ──────────────── BillItem

ProductVariant ──── has many ──────────────── StockMovement
Bill ─────────────── has many ──────────────── BillItem
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
Notes:
- `password_hash` stores bcrypt output only; never plain text.
- `role` is text with a check constraint; a PostgreSQL enum could be used but
  text is easier to evolve without migrations.
- `created_by` is NULL for the seed SUPER_ADMIN.

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
Notes:
- `parent_id` supports one level of nesting only. A category with a parent
  cannot itself have child categories (enforced at application level).
- `slug` is URL-safe, lowercase, hyphenated.
- Index: `slug`, `parent_id`, `is_active`.

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
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
sku                 TEXT NOT NULL UNIQUE
name                TEXT NOT NULL
slug                TEXT NOT NULL UNIQUE
description         TEXT NULL
brand_id            UUID NOT NULL REFERENCES brands(id)
category_id         UUID NOT NULL REFERENCES categories(id)
condition           TEXT NOT NULL CHECK (condition IN ('NEW','LIKE_NEW','GOOD','FAIR'))
price               NUMERIC(10,2) NOT NULL
compare_at_price    NUMERIC(10,2) NULL
cost_price          NUMERIC(10,2) NULL
stock_quantity      INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
is_listed           BOOLEAN NOT NULL DEFAULT false
visibility_override BOOLEAN NOT NULL DEFAULT false
is_featured         BOOLEAN NOT NULL DEFAULT false
specifications      JSONB NOT NULL DEFAULT '{}'
internal_notes      TEXT NULL
version             INTEGER NOT NULL DEFAULT 1
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at          TIMESTAMPTZ NULL
created_by          UUID NOT NULL REFERENCES users(id)
updated_by          UUID NOT NULL REFERENCES users(id)
```
Notes:
- `stock_quantity` has a CHECK constraint preventing negative values at the DB level.
- `version` is used for optimistic locking in concurrent update scenarios.
- `specifications` stores structured data: `{"storage": "128GB", "color": "Black", "network": "5G"}`.
- `cost_price` is internal only; never returned to public API consumers.
- `internal_notes` is admin-only; never returned to public API consumers.
- `is_listed`: manual admin toggle (false = admin deliberately unlisted it).
- `visibility_override`: when true, product appears publicly even at zero stock.

Computed visibility rule (applied in queries, not stored):
publicly_visible =

deleted_at IS NULL

AND is_listed = true

AND (stock_quantity > 0 OR visibility_override = true)
Indexes:
- `(slug)`, `(sku)`, `(brand_id)`, `(category_id)`, `(is_listed)`, `(deleted_at)`
- `(stock_quantity)` for low stock queries
- GIN index on `to_tsvector('english', name || ' ' || description)` for full-text search
- `(is_listed, deleted_at, stock_quantity)` composite for public catalog queries

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
Notes:
- `cloudinary_id` is stored separately from `url` to allow image management
  (deletion from Cloudinary) without URL reconstruction.
- One product should have exactly one `is_primary = true` image; enforced at
  application level (no DB unique constraint since it complicates partial updates).
- `ON DELETE CASCADE`: if a product is hard deleted, its images are removed from
  the DB. Admin must also call Cloudinary delete API for actual file cleanup.

Index: `(product_id, sort_order)`, `(product_id, is_primary)`.

---

### product_variants
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
sku             TEXT NOT NULL UNIQUE
name            TEXT NOT NULL
color           TEXT NULL
storage         TEXT NULL
price           NUMERIC(10,2) NOT NULL
stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
is_active       BOOLEAN NOT NULL DEFAULT true
version         INTEGER NOT NULL DEFAULT 1
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```
Notes:
- Variants have their own SKU and stock. The parent product's stock_quantity
  is the sum of all active variant stocks (maintained by trigger or application logic).
- If a product has no variants, billing uses the product's own stock directly.
- `color` and `storage` are the supported variant attributes in v1.

Index: `(product_id)`, `(sku)`.

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
- `bill_number` is a formatted sequential identifier: `BILL-YYYYMMDD-XXXX`.
  Generated by the application (not a DB sequence) to allow custom formatting.
- Bills are immutable once created. No UPDATE on bills after creation.
- Refunds are handled as separate adjustment records in v2.

Index: `(staff_id)`, `(created_at)`, `(bill_number)`.

---

### bill_items
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
bill_id         UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE
product_id      UUID NOT NULL REFERENCES products(id)
variant_id      UUID NULL REFERENCES product_variants(id)
quantity        INTEGER NOT NULL CHECK (quantity > 0)
unit_price      NUMERIC(10,2) NOT NULL
discount        NUMERIC(10,2) NOT NULL DEFAULT 0
line_total      NUMERIC(10,2) NOT NULL
product_name    TEXT NOT NULL
product_sku     TEXT NOT NULL
```
Notes:
- `product_name` and `product_sku` are denormalized at bill creation time.
  This preserves the bill record accurately even if the product is later renamed.
- `product_id` and `variant_id` retain the FK relationship for report queries,
  but the denormalized text fields are used for display.

Index: `(bill_id)`, `(product_id)`.

---

### stock_movements
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
product_id          UUID NOT NULL REFERENCES products(id)
variant_id          UUID NULL REFERENCES product_variants(id)
movement_type       TEXT NOT NULL CHECK (movement_type IN 
                    ('SALE','RESTOCK','MANUAL_ADJUSTMENT','INITIAL_STOCK'))
quantity_change     INTEGER NOT NULL
quantity_before     INTEGER NOT NULL
quantity_after      INTEGER NOT NULL
reference_type      TEXT NULL
reference_id        UUID NULL
notes               TEXT NULL
created_by          UUID NOT NULL REFERENCES users(id)
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```
Notes:
- This table is append-only. No updates or deletes.
- `reference_type` and `reference_id`: for SALE movements, these point to bills.
  For RESTOCK, they may point to a purchase order in a future version.
- `quantity_change` is negative for sales and adjustments that reduce stock,
  positive for restocks.

Index: `(product_id)`, `(created_at)`, `(movement_type)`, `(reference_id)`.

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
- This table is append-only.
- `old_data` and `new_data` store a snapshot of the record before and after
  the operation, allowing full diff reconstruction.
- `action` examples: `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_DELETED`,
  `STOCK_ADJUSTED`, `USER_CREATED`, `USER_DEACTIVATED`, `BILL_CREATED`.
- Sensitive fields (`cost_price`, `password_hash`) are excluded from snapshots.

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
Seed data:
- `shop_name` → "Mobilex"
- `currency_symbol` → "₹" (or owner's currency)
- `low_stock_threshold` → "3"
- `products_per_page` → "24"
- `receipt_footer_text` → "Thank you for your purchase!"
- `shop_address` → "123 Main Street, City"
- `shop_phone` → "+91 99999 99999"

---

## Prisma Schema Note
The above definitions map directly to the Prisma schema. The Prisma model names
use PascalCase (User, Product, Bill, etc.). The database tables use snake_case.
All models include `@@map("table_name")` decorators in the Prisma schema to
maintain the naming convention.
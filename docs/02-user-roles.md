# docs/02-USER-ROLES.md

# User Roles and Permission Model

## Role Hierarchy

The system defines four distinct access levels. Every authenticated user has
exactly one role. Roles are stored in the database and checked on every
protected server route.
SUPER_ADMIN > ADMIN > STAFF > PUBLIC (unauthenticated)
---

## Role Definitions

### PUBLIC (Unauthenticated)
Any visitor to the public website. No session required. No account exists.

**Permitted:**
- Browse the product catalog
- View product detail pages
- Search and filter products
- View category and brand pages

**Not Permitted:**
- Access any admin or staff route
- See unlisted/hidden products
- See out-of-stock products (unless visibility override is set by admin)
- See cost price or internal notes

---

### STAFF
Shop employees who operate the billing counter. Created by ADMIN or SUPER_ADMIN.
Must log in with email and password.

**Permitted (everything PUBLIC can do, plus):**
- Access the billing panel
- Search products by name, SKU, or barcode for billing
- Create new bills/invoices
- View bills they personally created
- View their own billing history
- Print/download receipts for bills they created

**Not Permitted:**
- Access the admin dashboard
- Create, edit, or delete products
- Change product visibility or pricing
- View other staff members' bills (unless promoted)
- Access audit logs
- Manage users

---

### ADMIN
Full internal business manager. Typically the business owner or a trusted manager.
Created by SUPER_ADMIN only.

**Permitted (everything STAFF can do, plus):**
- Full access to the admin dashboard
- Create, edit, archive, and delete products
- Manage product images (upload, reorder, delete)
- Manage categories and brands
- Manage product visibility independently of stock
- View and manage all bills regardless of which staff created them
- Manually adjust stock quantities with a reason log
- View audit logs for products, stock, and bills
- Create and deactivate STAFF accounts
- View sales and inventory reports
- Export reports as CSV

**Not Permitted:**
- Create or demote other ADMIN accounts (SUPER_ADMIN only)
- Modify system-level configuration (environment variables, integrations)
- Permanently delete audit logs

---

### SUPER_ADMIN
The system owner. Full unrestricted access to everything. Only one
SUPER_ADMIN account should exist in production. Created manually during
initial system seeding.

**Permitted (everything ADMIN can do, plus):**
- Create, edit, deactivate, and change roles of ADMIN accounts
- Access system configuration settings (currency symbol, shop name, etc.)
- View complete audit trail including admin actions
- Perform emergency hard deletes on records (with confirmation)
- Access database-level health and record count dashboards

---

## Permission Matrix

| Action                         | PUBLIC | STAFF | ADMIN | SUPER_ADMIN |
|-------------------------------|--------|-------|-------|-------------|
| Browse public catalog          | ✓      | ✓     | ✓     | ✓           |
| View product details           | ✓      | ✓     | ✓     | ✓           |
| Search products (public)       | ✓      | ✓     | ✓     | ✓           |
| Access billing screen          | ✗      | ✓     | ✓     | ✓           |
| Create bills                   | ✗      | ✓     | ✓     | ✓           |
| View own bills                 | ✗      | ✓     | ✓     | ✓           |
| View all bills                 | ✗      | ✗     | ✓     | ✓           |
| Access admin dashboard         | ✗      | ✗     | ✓     | ✓           |
| Create/edit products           | ✗      | ✗     | ✓     | ✓           |
| Delete products (soft)         | ✗      | ✗     | ✓     | ✓           |
| Delete products (hard)         | ✗      | ✗     | ✗     | ✓           |
| Manage images                  | ✗      | ✗     | ✓     | ✓           |
| Manage categories/brands       | ✗      | ✗     | ✓     | ✓           |
| Control product visibility     | ✗      | ✗     | ✓     | ✓           |
| Manual stock adjustment        | ✗      | ✗     | ✓     | ✓           |
| Create STAFF accounts          | ✗      | ✗     | ✓     | ✓           |
| Create ADMIN accounts          | ✗      | ✗     | ✗     | ✓           |
| Change user roles              | ✗      | ✗     | ✗     | ✓           |
| View audit logs                | ✗      | ✗     | ✓     | ✓           |
| View system config             | ✗      | ✗     | ✗     | ✓           |
| Edit system config             | ✗      | ✗     | ✗     | ✓           |

---

## Session Behavior

- Sessions are stored as server-side JWT tokens, signed and validated by NextAuth.js.
- Session expiry: 8 hours for STAFF (shift-length assumption); 24 hours for ADMIN/SUPER_ADMIN.
- All sessions are invalidated if the user's `is_active` flag is set to `false`.
- Role is embedded in the session token and re-validated against the database on
  sensitive admin operations (not just on login).
- No "remember me" functionality in v1 — all sessions expire on the configured timer.

---

## Account Management Rules

1. SUPER_ADMIN account is created via a one-time seed script run during initial deployment.
2. No public registration route exists for any role.
3. All account creation goes through the admin panel (ADMIN creates STAFF; SUPER_ADMIN creates ADMIN).
4. Deactivated accounts cannot log in but their records are preserved for audit history.
5. Passwords are hashed with bcrypt (cost factor 12) before storage. Plain text is never stored.
6. Password reset in v1: SUPER_ADMIN manually sets a temporary password; staff changes it on next login.
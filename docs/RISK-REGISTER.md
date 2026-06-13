# docs/15-RISK-REGISTER.md

# Risk Register

---

## Technical Risks

### RISK-T-01: Race Condition in Billing Stock Decrement
**Likelihood:** Medium (increases with concurrent staff users)
**Impact:** Critical (double-sell, negative stock)
**Mitigation:**
- `SELECT FOR UPDATE` row locking in PostgreSQL transaction.
- `CHECK (stock_quantity >= 0)` constraint at DB level.
- `version` field for optimistic locking as secondary defense.
- Integration test that explicitly tests concurrent billing.

**Residual Risk:** Low after mitigation.

---

### RISK-T-02: ISR Cache Serving Stale Product Data
**Likelihood:** Medium
**Impact:** Medium (customer sees a product as visible that was just unlisted)
**Mitigation:**
- Call `revalidatePath()` on every admin product mutation.
- Keep ISR timer short (30s for product pages).
- Public customers browsing stale cached pages cannot bill/buy — they must visit the shop physically, so a 30-second lag is acceptable.

**Residual Risk:** Low. Acceptable for this business model.

---

### RISK-T-03: Cloudinary Service Outage
**Likelihood:** Low
**Impact:** Medium (images broken on product pages; admin cannot upload)
**Mitigation:**
- Use Cloudinary's CDN (very high uptime SLA).
- Store `url` in DB so images load from Cloudinary CDN, not from the app server.
- Implement `<Image>` fallback placeholder for broken image loads.
- Admin image upload failure should be handled gracefully (retry option).

**Residual Risk:** Low.

---

### RISK-T-04: Neon Database Outage
**Likelihood:** Very Low
**Impact:** Critical (entire application down)
**Mitigation:**
- Neon has 99.9%+ SLA.
- ISR-cached public pages continue to serve from Vercel CDN during short DB outages.
- Daily backup exports to separate storage for disaster recovery.
- Admin should be aware of Neon status page (status.neon.tech).

**Residual Risk:** Very Low.

---

### RISK-T-05: Prisma Migration Failure on Production
**Likelihood:** Low
**Impact:** High (deployment blocked; potential data state confusion)
**Mitigation:**
- Run migrations in development first.
- Review generated SQL before running on production.
- Use Neon's point-in-time restore to recover from a bad migration.
- Never run `prisma migrate reset` on production.
- Use `prisma migrate deploy` (not `dev`) in production (only applies pending migrations).

**Residual Risk:** Low.

---

### RISK-T-06: Admin Accidentally Hard-Deletes Product With Sales History
**Likelihood:** Low
**Impact:** High (financial records corrupted)
**Mitigation:**
- Hard delete blocked at API level if any bills reference the product.
- Hard delete requires SUPER_ADMIN role.
- Hard delete requires explicit confirmation dialog with product name re-entry.
- Soft delete is the default action for all lower roles.

**Residual Risk:** Very Low.

---

## Business Risks

### RISK-B-01: Staff Creates Bill With Wrong Product
**Likelihood:** Medium
**Impact:** Medium (stock decremented for wrong item)
**Mitigation:**
- Bill review screen before final "Create Bill" button.
- Show product image, name, SKU, and price on the bill item.
- Receipt shows all items for review.
- Bills cannot be edited after creation — refund/adjustment in v2.

**Residual Risk:** Low-Medium. Procedural training also helps.

---

### RISK-B-02: Product Visibility Is Not Updated Promptly
**Likelihood:** Low (with on-demand revalidation)
**Impact:** Low-Medium (customer sees out-of-stock or unlisted product briefly)
**Mitigation:**
- `revalidatePath()` called immediately after admin action.
- ISR timer (30s) as fallback.

**Residual Risk:** Very Low.

---

### RISK-B-03: Internet Outage at Shop Counter During Billing
**Likelihood:** Medium (local ISP issues)
**Impact:** High (billing system unavailable; shop operations halted)
**Mitigation:**
- This risk is inherent to any cloud-based system.
- Mitigation: have a fallback manual receipt pad for use during outages.
- Consider offline bill drafts in v2 (Service Worker + local IndexedDB, sync when online).

**Residual Risk:** Medium. Accepted for v1.

---

### RISK-B-04: Multiple Staff Billing the Same Last-Unit Product
**Likelihood:** Low-Medium
**Impact:** Medium (one transaction fails with UNIT_NOT_AVAILABLE error)
**Mitigation:**
- Transaction with `SELECT FOR UPDATE` ensures exactly one transaction succeeds.
- The losing transaction gets a clear error message with the item name.
- Staff removes the sold-out unit and selects another available unit.

**Residual Risk:** Low. Failure is graceful, not silent.

---

## Operational Risks

### RISK-O-01: Lost Access to SUPER_ADMIN Account
**Likelihood:** Low
**Impact:** Critical (system lockout)
**Mitigation:**
- Keep SUPER_ADMIN credentials in a secure password manager.
- Document a recovery procedure: developer with DB access can directly update
  `users` table to reset password hash.

**Residual Risk:** Low.

---

### RISK-O-02: Vercel Billing / Service Suspension
**Likelihood:** Very Low
**Impact:** High
**Mitigation:**
- Keep payment method current in Vercel account.
- Monitor Vercel usage against plan limits.
- Application is standard Next.js — portable to Netlify or Railway if needed.

**Residual Risk:** Very Low.
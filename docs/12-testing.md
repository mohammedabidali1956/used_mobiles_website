# docs/13-TESTING-MODEL.md

# Testing Model

---

## Testing Philosophy

Tests must protect the business logic. The billing transaction, stock
decrement, and visibility rules are the most critical paths in the system.
These must have integration tests. Everything else can be covered with
lighter-weight approaches.

Do not aim for 100% line coverage. Aim for 100% coverage of critical paths.

---

## Test Types and Scope

### Unit Tests (Service Layer)
Test service functions in isolation with a mocked Prisma client.

**Tools:** Vitest + `vitest-mock-extended` for Prisma mocking.

**What to unit test:**
- `product.service.ts`: visibility computation, slug generation, field sanitization.
- `billing.service.ts`: bill total calculation, discount application, bill number generation.
- `stock.service.ts`: movement record creation, negative stock prevention.
- `audit.service.ts`: log entry formatting.
- Zod schemas: valid input acceptance, invalid input rejection.

**What NOT to unit test:**
- Prisma ORM itself (trust it).
- React components (covered by E2E).

### Integration Tests (API + Database)
Test full API routes against a real test database.

**Tools:** Vitest + a dedicated test Neon branch database.
The test DB is reset to a known state before each test run.

**What to integration test:**
- `POST /api/billing/bills`: full transaction (stock decremented, bill created, movements recorded).
- Concurrent billing: two requests for the same product with stock = 1.
  Only one should succeed; the other should return INSUFFICIENT_STOCK.
- `DELETE /api/admin/products/[id]`: verify soft delete, public query returns nothing.
- `PATCH /api/admin/products/[id]/visibility`: verify public query reflects change.
- Authentication: unauthorized routes return 401/403.
- Manual stock adjustment: movement record created, stock updated correctly.

### End-to-End Tests (Critical User Flows)
Test the full browser flow against a live preview deployment.

**Tools:** Playwright.

**E2E Scenarios to Cover:**

1. **Public browsing:**
   - Homepage loads, categories visible.
   - Product catalog loads, filter by brand works, URL updates.
   - Product detail page loads with correct data.
   - Out-of-stock product is not visible on public catalog.

2. **Admin flow:**
   - Login with ADMIN credentials.
   - Create a product (fill form, upload image, set stock = 5, publish).
   - Verify product appears on public site.
   - Unlist the product.
   - Verify product disappears from public site.
   - Soft-delete the product.
   - Verify product is not visible publicly or in listed products.

3. **Billing flow:**
   - Login with STAFF credentials.
   - Search for a product on billing screen.
   - Add it to bill (quantity 2).
   - Set payment method to Cash.
   - Create bill.
   - Verify receipt shows correct data.
   - Verify stock decremented by 2 (check admin stock panel).
   - Attempt to create another bill exceeding remaining stock.
   - Verify it is rejected.

4. **Role enforcement:**
   - Attempt to access `/admin` as STAFF user. Expect redirect to login or 403.
   - Attempt to access `/billing` as a public visitor. Expect redirect to login.

---

## Test Data Strategy

A seed script (`prisma/seed.test.ts`) creates a deterministic test state:
- 1 SUPER_ADMIN, 1 ADMIN, 1 STAFF user.
- 2 categories, 2 brands.
- 5 products: 2 listed with stock, 1 listed with zero stock, 1 unlisted, 1 deleted.
- 0 bills (tests create their own).

The test DB is reset with `prisma migrate reset` before the integration
test suite runs.

---

## CI Integration

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npx prisma generate
      - run: npm run test:unit          # vitest unit tests
      - run: npm run test:integration   # vitest integration (needs DB)
      - run: npm run build              # verify build passes
```

E2E tests (Playwright) are run on Vercel Preview deployments (triggered by PR),
not in the CI unit test pipeline, to avoid long CI times.

---

## Coverage Targets

| Test Type      | Target Coverage                         |
|----------------|-----------------------------------------|
| Unit           | 90%+ of service layer functions         |
| Integration    | 100% of billing flow; 100% of auth gates|
| E2E            | All critical user flows listed above    |

---

## Manual QA Checklist (Pre-Release)

- [ ] Mobile: catalog browsing on iPhone and Android.
- [ ] Mobile: product detail page gallery works.
- [ ] Desktop: billing panel full flow.
- [ ] Print: receipt print layout looks correct.
- [ ] Low stock: product shows warning in admin at threshold.
- [ ] Stock = 0: product disappears from public, appears in admin.
- [ ] Override: product at zero stock appears publicly when override is set.
- [ ] Audit log: all major actions appear with correct user attribution.
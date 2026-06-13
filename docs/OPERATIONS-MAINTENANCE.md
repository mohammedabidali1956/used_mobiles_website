# docs/16-OPERATIONS-MAINTENANCE.md

# Operations and Maintenance

---

## Day-to-Day Operations

### What the Owner/Admin Manages Regularly
- Adding new products (via admin panel → New Product).
- Updating prices when market changes.
- Restocking products after buying new phones (admin panel → Stock Management → Adjust).
- Listing/unlisting products as needed.
- Creating new staff accounts when staff join.
- Deactivating staff accounts when staff leave.
- Reviewing the daily sales bills (admin panel → Bills → filter by today).

### What Requires No Regular Attention
- Database backups (automatic via Neon).
- SSL certificate renewal (automatic via Vercel).
- Server maintenance (Vercel and Neon handle this).
- CDN cache management (automatic via ISR).
- Error monitoring (Sentry sends email alerts automatically).

---

## Backup and Recovery

### Automatic Backups
Neon performs continuous backups. Point-in-time restore is available:
- Free tier: restore to any point within the last 7 days.
- Pro tier: restore to any point within the last 30 days.

To restore: log in to Neon dashboard → Branch → Restore to point in time.
A new branch is created with the restored data. You can then clone it back
to production or query it to recover specific records.

### Manual Export Backup (Recommended Weekly)
Set up a weekly scheduled GitHub Action that runs:
```bash
pg_dump $DIRECT_DATABASE_URL --format=custom --no-acl > backup-$(date +%Y%m%d).dump
# Upload to S3 or Google Drive
```

### Recovery Procedure (Major Data Loss)
1. Identify the restore point (time before data loss).
2. Use Neon PITR to create a restored branch.
3. Update `DATABASE_URL` in Vercel to point to restored branch (temporary).
4. Verify data is correct in the restored branch.
5. If correct, promote the restored branch to be the new main branch.
6. Update `DATABASE_URL` back to the new main connection string.

Total recovery time estimate: 30–60 minutes.

---

## Monitoring Procedures

### Sentry (Error Monitoring)
- Check Sentry dashboard weekly for new errors.
- Any error spike (> 10 errors in an hour) triggers an email alert.
- Errors include full stack trace and request context.
- Fix and deploy: resolve in code, merge to main, Vercel auto-deploys.

### UptimeRobot
- Configured to check the homepage every 1 minute.
- Sends SMS/email alert if the site is down for > 3 minutes.
- Check the UptimeRobot dashboard monthly to review uptime history.

### Vercel Analytics
- Review weekly: which pages are slowest, which pages have most traffic.
- If a page's LCP rises above 2.5s, investigate and optimize.

---

## Updating the System

### Dependency Updates
Run monthly:
```bash
npx npm-check-updates -u  # or use Dependabot (GitHub bot)
npm install
# Run tests
# Deploy
```

### Schema Changes (Adding New Fields/Tables)
1. Modify `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name descriptive_name`.
3. Review generated SQL.
4. Commit migration files.
5. Merge to main → Vercel deploys new code.
6. Run `npx prisma migrate deploy` against production database.

### Code Updates (Bug Fixes, Features)
1. Create branch → make changes → run tests.
2. Create PR → merge to main.
3. Vercel auto-deploys within 2–3 minutes.
4. Verify on production URL.

---

## Future Scaling Considerations

### When Catalog Exceeds 5,000 Products
- Review and optimize database indexes.
- Add Algolia or Typesense for search (replace PostgreSQL full-text search).
- Consider adding Redis caching for frequently read data (category list, brand list).

### When Traffic Exceeds Vercel Hobby Tier
- Upgrade to Vercel Pro (~$20/month) — gives 100× more serverless function
  execution time and removes bandwidth limits.

### When Multiple Locations Are Needed
- Add a `location_id` field to products and bills.
- Add location-based stock management.
- This is a schema change — designed here, implemented in future phase.

### When Offline Billing Is Needed
- Build a Service Worker for offline bill drafts.
- Use browser IndexedDB to store draft bills.
- Sync to server when internet reconnects.
- This is a v2 feature — design must be added to the data model at that time.

### When Customer Accounts Are Needed
- Add a `customers` table with name, phone, email, purchase history.
- Link `bills.customer_id` to the customers table.
- Build a customer portal or WhatsApp integration.

### When Online Payment Is Needed
- Integrate Razorpay or Stripe for online payment.
- Add payment_status field to bills.
- Build a checkout flow on the public site.
- This is a significant scope addition — requires new pages, new API routes,
  webhook handling, and payment reconciliation logic.

---

## Handover Checklist (Developer to Owner)

The following must be completed before the developer hands the system to
the business owner:

- [ ] All Vercel environment variables documented and provided to owner.
- [ ] Neon account access transferred to owner's email.
- [ ] Cloudinary account access transferred to owner's email.
- [ ] SUPER_ADMIN credentials documented in owner's password manager.
- [ ] Owner trained on: adding products, restocking, creating staff accounts.
- [ ] Owner trained on: reading the audit log, viewing reports.
- [ ] Staff trained on: billing screen operation, creating bills, printing receipts.
- [ ] Sentry alerts configured to send to owner's email.
- [ ] UptimeRobot configured to send alerts to owner's phone.
- [ ] Backup procedure documented and verified working.
- [ ] Domain renewal date noted in owner's calendar.
- [ ] Recovery procedure document provided to owner in writing.
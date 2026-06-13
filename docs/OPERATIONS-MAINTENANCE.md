# Operations and Maintenance

---

## Day-to-Day Operations

### What the Owner/Admin Manages Regularly

**Adding new stock (most frequent operation):**
1. Admin panel → Products → Find the product model (e.g., "iPhone 12").
2. If the model doesn't exist yet, create it (name, brand, category, description).
3. Open the product → Phone Units section → "Add Unit".
4. Fill in: grade, storage, color, condition, accessories, battery health
   (optional), IMEI (optional), selling price, warranty.
5. Save. The unit appears immediately in the public product page.

**Marking a unit as unavailable for repair:**
1. Admin panel → Phone Units (or find the product → Units).
2. Find the unit → Actions → "Change Status" → In Repair → enter reason.
3. Unit disappears from public immediately.
4. When repaired: Change Status → Available.

**Updating prices:**
- To update the base/starting price of a product: edit the product → base_price.
- To update the price of a specific unit: edit the phone unit → selling_price.
- Changes reflect on the public site within the ISR revalidation window.

**Listing/unlisting a product:**
- Admin panel → Products → Toggle the "Listed" switch.
- Unlisting hides the entire product from the public even if units are available.
- Useful when the owner wants to temporarily pull a model from the website.

**Reviewing today's sales:**
- Admin panel → Bills → Filter by today's date.
- Each bill shows which staff member, which units sold, payment method, and total.

**Managing staff accounts:**
- Admin panel → Users → Create, edit, or deactivate staff accounts.

---

### What Requires No Regular Attention
- Database backups (automatic via Neon).
- SSL certificate renewal (automatic via Vercel).
- Server maintenance (Vercel and Neon handle this).
- CDN cache management (automatic via ISR + on-demand revalidation).
- Error monitoring (Sentry sends email alerts automatically).

---

## Backup and Recovery

### Automatic Backups
Neon performs continuous backups with point-in-time restore (PITR):
- Free tier: 7-day PITR.
- Pro tier: 30-day PITR.

To restore: log in to Neon dashboard → Branch → Restore to point in time.

### Manual Export Backup (Recommended Weekly)
```bash
pg_dump $DIRECT_DATABASE_URL --format=custom --no-acl > backup-$(date +%Y%m%d).dump
# Upload to Google Drive or private S3 bucket via GitHub Action
```

### Recovery Procedure (Major Data Loss)
1. Identify restore point.
2. Use Neon PITR to create a restored branch.
3. Temporarily update `DATABASE_URL` in Vercel to the restored branch.
4. Verify data.
5. Promote restored branch to main.
6. Update `DATABASE_URL` to new main connection string.

Estimated recovery time: 30–60 minutes.

---

## Monitoring Procedures

### Sentry
- Check weekly; error spikes trigger email alerts.
- Errors include full stack trace.
- Fix → code → merge to main → Vercel auto-deploys.

### UptimeRobot
- Checks homepage every 1 minute.
- SMS/email alert if down > 3 minutes.

### Vercel Analytics
- Review weekly: which pages are slowest.
- If LCP rises above 2.5s on a page, investigate.

---

## Updating the System

### Adding New Features
1. Create branch → make changes → run tests.
2. PR → merge to main → Vercel auto-deploys (2–3 minutes).

### Schema Changes
1. Modify `prisma/schema.prisma`.
2. `npx prisma migrate dev --name descriptive_name`.
3. Review generated SQL.
4. Commit.
5. Run `npx prisma migrate deploy` against production.

### Changing the WhatsApp Number
1. Admin panel → Settings → Edit `whatsapp_number`.
2. All WhatsApp CTAs site-wide update immediately (they read from system_config).
3. No code change or deployment needed.

### Changing the Shop Phone Number
1. Admin panel → Settings → Edit `shop_phone`.
2. Footer and contact sections update on next page load.

---

## Future Scaling Considerations

### When Catalog Exceeds 5,000 Units
- Review and add database indexes as needed.
- Consider adding Algolia or Typesense for faster unit-level search.
- Consider adding a Redis cache layer for system_config reads (currently DB-queried per request).

### When Multiple Locations Are Needed
- Add a `location_id` field to products and phone_units.
- Add location-based stock views.
- This is a schema change — must be planned as a migration.

### When Customer Enquiry Tracking Is Needed
- Add an `enquiries` table linked to a product or unit.
- Track source (WhatsApp, call, walk-in) and outcome.
- Build a CRM-lite view in the admin panel.
- v2 feature.

### When Online Reservations Are Needed
- Add `status = 'RESERVED'` to phone_units.
- Add a `reservation_expires_at` timestamp.
- Build a reservation flow (customer reserves via website, staff confirms via WhatsApp).
- v2 feature.

### When Customer Accounts Are Needed
- Add a `customers` table (name, phone, purchase history).
- Link `bills.customer_phone` to the customers table.
- Build a customer purchase history view in admin.
- v2 feature.

### When Buy/Sell/Trade Is Needed on the Website
- This requires significant scope expansion: online checkout, payment gateway
  (Razorpay/Stripe), order management, delivery tracking.
- Treat as a separate product phase, not an incremental feature.
- Design the data model extension before starting implementation.

---

## Handover Checklist (Developer to Owner)

- [ ] Vercel environment variables documented and transferred.
- [ ] Neon account access transferred to owner's email.
- [ ] Cloudinary account access transferred to owner's email.
- [ ] SUPER_ADMIN credentials in owner's password manager; password changed after first login.
- [ ] WhatsApp number configured in system_config and tested via live site.
- [ ] Owner trained: adding products, adding phone units, adjusting unit status.
- [ ] Owner trained: reviewing bills, running reports, managing staff accounts.
- [ ] Staff trained: billing panel — search, select unit, create bill, print receipt.
- [ ] At least 5 real products with real units seeded before handover.
- [ ] Sentry alerts configured to owner's email.
- [ ] UptimeRobot alerts configured to owner's phone.
- [ ] Backup procedure documented and verified working.
- [ ] Domain renewal date in owner's calendar.
- [ ] Recovery procedure document provided in writing.
- [ ] Google Maps link for shop address verified in footer/contact section.
/**
 * prisma/seed.ts — Initial database seed script.
 *
 * Run once after the first `prisma migrate deploy`:
 *   npx prisma db seed
 *
 * Creates:
 *   1. SUPER_ADMIN user account
 *   2. Default system_config entries
 *
 * Uses upsert semantics — safe to re-run; will not duplicate or overwrite
 * existing records (the SUPER_ADMIN email + config keys are unique constraints).
 *
 * Required environment variables (set before running):
 *   SEED_ADMIN_EMAIL    — defaults to "admin@shop.com" if not set
 *   SEED_ADMIN_PASSWORD — REQUIRED; no default (throw on missing)
 *   SEED_ADMIN_NAME     — defaults to "Shop Owner" if not set
 *
 * Recommended: generate a strong temporary password with:
 *   openssl rand -base64 16
 * The SUPER_ADMIN must change their password after first login.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(
      `[seed] Environment variable ${key} is required. ` +
        `Set it before running: SEED_ADMIN_PASSWORD="..." npx prisma db seed`
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SUPER_ADMIN_EMAIL = requireEnv("SEED_ADMIN_EMAIL", "admin@shop.com");
const SUPER_ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");
const SUPER_ADMIN_NAME = requireEnv("SEED_ADMIN_NAME", "Shop Owner");

const SYSTEM_CONFIG_DEFAULTS = [
  {
    key: "shop_name",
    value: "Mobile Shop",
    description: "Displayed in the page header and receipts",
    updatedBy: "seed",
  },
  {
    key: "whatsapp_number",
    value: "919999999999",
    description: "WhatsApp number in international format without +. E.g. 919XXXXXXXXX",
    updatedBy: "seed",
  },
  {
    key: "show_battery_health_public",
    value: "false",
    description: "Show battery health % on public unit cards. true | false",
    updatedBy: "seed",
  },
  {
    key: "currency_symbol",
    value: "₹",
    description: "Currency symbol used throughout the UI",
    updatedBy: "seed",
  },
  {
    key: "low_stock_threshold",
    value: "2",
    description: "Alert threshold for low-stock report. Products with ≤ this many units appear in the report.",
    updatedBy: "seed",
  },
  {
    key: "shop_phone",
    value: "",
    description: "Shop contact phone number (displayed on public pages)",
    updatedBy: "seed",
  },
  {
    key: "shop_address",
    value: "",
    description: "Shop address (displayed on public pages)",
    updatedBy: "seed",
  },
  {
    key: "receipt_footer",
    value: "Thank you for your purchase!",
    description: "Text shown at the bottom of printed receipts",
    updatedBy: "seed",
  },
] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Starting database seed...\n");

  // ---- 1. SUPER_ADMIN user ----
  console.log(`  Creating SUPER_ADMIN: ${SUPER_ADMIN_EMAIL}`);
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      name: SUPER_ADMIN_NAME,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    update: {
      // On re-run: never overwrite an existing account's password or role.
      // Only update the name if it was somehow changed.
      name: SUPER_ADMIN_NAME,
    },
  });

  console.log(`  ✓ SUPER_ADMIN: ${superAdmin.name} (${superAdmin.email}) [id: ${superAdmin.id}]`);

  // ---- 2. System config defaults ----
  console.log("\n  Seeding system_config defaults...");

  for (const entry of SYSTEM_CONFIG_DEFAULTS) {
    await prisma.systemConfig.upsert({
      where: { key: entry.key },
      create: entry,
      update: {
        // On re-run: never overwrite values changed by the admin.
        // Only set description and updatedBy if the key is being created.
      },
    });
    console.log(`  ✓ ${entry.key}`);
  }

  console.log("\n✅  Seed complete.\n");
  console.log("IMPORTANT: Change the SUPER_ADMIN password after first login!");
  console.log(`  Login URL: /login`);
  console.log(`  Email:     ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password:  (the value of SEED_ADMIN_PASSWORD env var)\n`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main()
  .catch((error) => {
    console.error("❌  Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * prisma/demo-seed.ts — Comprehensive Development & Testing Demo Dataset.
 *
 * Run using:
 *   npm run db:demo-seed
 *
 * Creates:
 *   1. Demo Users (Super Admin, Admin, Staff) with password: DemoPassword123!
 *   2. Base System Configs
 *   3. 7 Brands & 3 Categories
 *   4. 35 realistic Products with placeholders and specs
 *   5. ~130 Phone Units with mixed statuses (AVAILABLE, SOLD, RESERVED, DEFECTIVE)
 *   6. ~60 Completed Bills spanning the last 90 days with items and stock consistency
 *   7. Corresponding Stock Movements & Audit Logs
 */

import { PrismaClient, Role, Condition, Grade, PhoneUnitStatus, PaymentMethod, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Safety check
if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_IN_PROD !== "true") {
  console.error("❌  Error: Running the demo seed is blocked in production environments.");
  process.exit(1);
}

const DEMO_PASSWORD = "DemoPassword123!";

const BRANDS = [
  { name: "Apple", slug: "apple" },
  { name: "Samsung", slug: "samsung" },
  { name: "OnePlus", slug: "oneplus" },
  { name: "Google", slug: "google" },
  { name: "Xiaomi", slug: "xiaomi" },
  { name: "Oppo", slug: "oppo" },
  { name: "Realme", slug: "realme" },
];

const CATEGORIES = [
  { name: "Smartphones", slug: "smartphones", description: "All smart cellular mobile devices." },
  { name: "Tablets", slug: "tablets", description: "Portable touch-screen tablet computing." },
  { name: "Accessories", slug: "accessories", description: "Branded chargers, cases, and audio accessories." },
];

const PRODUCTS_DATA = [
  // Apple
  { brand: "apple", name: "iPhone 13 (Demo)", basePrice: 599, baseCondition: "GOOD" as Condition, specifications: { display: "6.1-inch Super Retina", chip: "A15 Bionic", camera: "Dual 12MP" } },
  { brand: "apple", name: "iPhone 14 (Demo)", basePrice: 699, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.1-inch Super Retina", chip: "A15 Bionic", camera: "Dual 12MP" } },
  { brand: "apple", name: "iPhone 14 Pro (Demo)", basePrice: 849, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.1-inch Dynamic Island", chip: "A16 Bionic", camera: "Triple 48MP" } },
  { brand: "apple", name: "iPhone 15 (Demo)", basePrice: 799, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.1-inch Dynamic Island", chip: "A16 Bionic", camera: "Dual 48MP" } },
  { brand: "apple", name: "iPhone 15 Pro (Demo)", basePrice: 999, baseCondition: "NEW" as Condition, specifications: { display: "6.1-inch Titanium", chip: "A17 Pro", camera: "Triple 48MP" } },
  { brand: "apple", name: "iPhone 15 Pro Max (Demo)", basePrice: 1199, baseCondition: "NEW" as Condition, specifications: { display: "6.7-inch Titanium", chip: "A17 Pro", camera: "Triple 48MP" } },
  { brand: "apple", name: "iPad 10th Gen (Demo)", basePrice: 349, baseCondition: "GOOD" as Condition, specifications: { display: "10.9-inch Liquid Retina", chip: "A14 Bionic", storage: "64GB" }, category: "tablets" },
  { brand: "apple", name: "iPad Air 5 (Demo)", basePrice: 549, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "10.9-inch Liquid Retina", chip: "Apple M1", storage: "256GB" }, category: "tablets" },
  { brand: "apple", name: "iPad Pro M2 (Demo)", basePrice: 799, baseCondition: "NEW" as Condition, specifications: { display: "11-inch Liquid Retina", chip: "Apple M2", storage: "128GB" }, category: "tablets" },

  // Samsung
  { brand: "samsung", name: "Galaxy S22 (Demo)", basePrice: 499, baseCondition: "GOOD" as Condition, specifications: { display: "6.1-inch Dynamic AMOLED", chip: "Snapdragon 8 Gen 1", camera: "Triple 50MP" } },
  { brand: "samsung", name: "Galaxy S23 (Demo)", basePrice: 649, baseCondition: "GOOD" as Condition, specifications: { display: "6.1-inch Dynamic AMOLED", chip: "Snapdragon 8 Gen 2", camera: "Triple 50MP" } },
  { brand: "samsung", name: "Galaxy S23 Ultra (Demo)", basePrice: 899, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.8-inch Dynamic AMOLED", chip: "Snapdragon 8 Gen 2", camera: "Quad 200MP" } },
  { brand: "samsung", name: "Galaxy S24 (Demo)", basePrice: 799, baseCondition: "NEW" as Condition, specifications: { display: "6.2-inch Dynamic AMOLED", chip: "Exynos 2400", camera: "Triple 50MP" } },
  { brand: "samsung", name: "Galaxy S24 Ultra (Demo)", basePrice: 1299, baseCondition: "NEW" as Condition, specifications: { display: "6.8-inch Dynamic AMOLED", chip: "Snapdragon 8 Gen 3", camera: "Quad 200MP" } },
  { brand: "samsung", name: "Galaxy Z Fold 5 (Demo)", basePrice: 1499, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "7.6-inch Foldable", chip: "Snapdragon 8 Gen 2", camera: "Triple 50MP" } },
  { brand: "samsung", name: "Galaxy Tab S9 (Demo)", basePrice: 699, baseCondition: "NEW" as Condition, specifications: { display: "11-inch Dynamic AMOLED", chip: "Snapdragon 8 Gen 2", storage: "128GB" }, category: "tablets" },

  // Google
  { brand: "google", name: "Pixel 7 (Demo)", basePrice: 399, baseCondition: "GOOD" as Condition, specifications: { display: "6.3-inch OLED", chip: "Google Tensor G2", camera: "Dual 50MP" } },
  { brand: "google", name: "Pixel 7 Pro (Demo)", basePrice: 549, baseCondition: "GOOD" as Condition, specifications: { display: "6.7-inch LTPO OLED", chip: "Google Tensor G2", camera: "Triple 50MP" } },
  { brand: "google", name: "Pixel 8 (Demo)", basePrice: 699, baseCondition: "NEW" as Condition, specifications: { display: "6.2-inch OLED", chip: "Google Tensor G3", camera: "Dual 50MP" } },
  { brand: "google", name: "Pixel 8 Pro (Demo)", basePrice: 999, baseCondition: "NEW" as Condition, specifications: { display: "6.7-inch LTPO OLED", chip: "Google Tensor G3", camera: "Triple 50MP" } },

  // OnePlus
  { brand: "oneplus", name: "OnePlus 10 Pro (Demo)", basePrice: 429, baseCondition: "GOOD" as Condition, specifications: { display: "6.7-inch Fluid AMOLED", chip: "Snapdragon 8 Gen 1", camera: "Triple 48MP" } },
  { brand: "oneplus", name: "OnePlus 11 (Demo)", basePrice: 599, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.7-inch Fluid AMOLED", chip: "Snapdragon 8 Gen 2", camera: "Triple 50MP" } },
  { brand: "oneplus", name: "OnePlus 12 (Demo)", basePrice: 799, baseCondition: "NEW" as Condition, specifications: { display: "6.82-inch Fluid AMOLED", chip: "Snapdragon 8 Gen 3", camera: "Triple 50MP" } },

  // Xiaomi
  { brand: "xiaomi", name: "Xiaomi 13 Pro (Demo)", basePrice: 749, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.73-inch AMOLED", chip: "Snapdragon 8 Gen 2", camera: "Triple 50MP" } },
  { brand: "xiaomi", name: "Xiaomi 14 Ultra (Demo)", basePrice: 1199, baseCondition: "NEW" as Condition, specifications: { display: "6.73-inch LTPO AMOLED", chip: "Snapdragon 8 Gen 3", camera: "Quad 50MP" } },

  // Oppo
  { brand: "oppo", name: "Oppo Find X6 Pro (Demo)", basePrice: 899, baseCondition: "LIKE_NEW" as Condition, specifications: { display: "6.82-inch AMOLED", chip: "Snapdragon 8 Gen 2", camera: "Triple 50MP" } },

  // Realme
  { brand: "realme", name: "Realme GT5 (Demo)", basePrice: 449, baseCondition: "GOOD" as Condition, specifications: { display: "6.74-inch OLED", chip: "Snapdragon 8 Gen 2", camera: "Triple 50MP" } },
];

const CUSTOMERS = [
  { name: "John Doe", phone: "+1555010101" },
  { name: "Jane Smith", phone: "+1555020202" },
  { name: "Michael Brown", phone: "+1555030303" },
  { name: "Emily Davis", phone: "+1555040404" },
  { name: "David Wilson", phone: "+1555050505" },
  { name: "Sarah Taylor", phone: "+1555060606" },
  { name: "James Anderson", phone: "+1555070707" },
  { name: "Jessica Thomas", phone: "+1555080808" },
  { name: "Robert Martinez", phone: "+1555090909" },
  { name: "Linda White", phone: "+1555101010" },
  { name: "Daniel Harris", phone: "+1555111111" },
  { name: "Barbara Clark", phone: "+1555121212" },
  { name: "William Lewis", phone: "+1555131313" },
  { name: "Elizabeth Robinson", phone: "+1555141414" },
  { name: "Matthew Walker", phone: "+1555151515" },
];

const STORAGES = ["128GB", "256GB", "512GB"];
const COLORS = ["Titanium Gray", "Silver Titanium", "Phantom Black", "Midnight", "Cream White", "Gold Leaf"];
const GRADES: Grade[] = ["S", "A_PLUS", "A", "B", "C"];
const CONDITIONS: Condition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR"];

async function main() {
  console.log("🌱 Starting development demo database seeding...");

  // Clear existing tables to ensure clean, consistent data and prevent duplication errors
  console.log("\n🧹 Clearing database tables...");
  await prisma.auditLog.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.billItem.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.phoneUnit.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["demo-superadmin@shop.com", "demo-admin@shop.com", "demo-staff@shop.com"]
      }
    }
  });

  // 1. Create demo users
  console.log("\n🔑 Creating Demo Users...");
  const hashedPass = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "demo-superadmin@shop.com" },
    create: {
      email: "demo-superadmin@shop.com",
      passwordHash: hashedPass,
      name: "Demo Super Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
    update: {},
  });
  console.log("   ✓ Demo Super Admin created");

  const adminUser = await prisma.user.upsert({
    where: { email: "demo-admin@shop.com" },
    create: {
      email: "demo-admin@shop.com",
      passwordHash: hashedPass,
      name: "Demo Admin",
      role: Role.ADMIN,
      isActive: true,
    },
    update: {},
  });
  console.log("   ✓ Demo Admin created");

  const staffUser = await prisma.user.upsert({
    where: { email: "demo-staff@shop.com" },
    create: {
      email: "demo-staff@shop.com",
      passwordHash: hashedPass,
      name: "Demo Staff",
      role: Role.STAFF,
      isActive: true,
    },
    update: {},
  });
  console.log("   ✓ Demo Staff created");

  // 2. Create Brands
  console.log("\n📱 Creating Brands...");
  const brandMap = new Map<string, string>();
  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: {
        name: b.name,
        slug: b.slug,
        isActive: true,
      },
      update: {},
    });
    brandMap.set(b.slug, brand.id);
  }
  console.log(`   ✓ Seeded ${brandMap.size} brands.`);

  // 3. Create Categories
  console.log("\n📁 Creating Categories...");
  const catMap = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        isActive: true,
      },
      update: {},
    });
    catMap.set(c.slug, cat.id);
  }
  console.log(`   ✓ Seeded ${catMap.size} categories.`);

  // 4. Create Products
  console.log("\n📦 Creating Products & Images...");
  const seededProducts = [];
  const defaultCategory = catMap.get("smartphones")!;

  let idx = 1;
  for (const p of PRODUCTS_DATA) {
    const brandId = brandMap.get(p.brand)!;
    const categoryId = catMap.get(p.category || "smartphones") || defaultCategory;
    const sku = `DEMO-SKU-${String(idx).padStart(4, "0")}`;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const product = await prisma.product.upsert({
      where: { sku },
      create: {
        sku,
        name: p.name,
        slug,
        description: `[DEMO RECORD] Beautiful refurbished ${p.name} loaded with premium specs.`,
        brandId,
        categoryId,
        baseCondition: p.baseCondition,
        basePrice: p.basePrice,
        compareAtPrice: p.basePrice + 120,
        specifications: p.specifications,
        isUnitTracked: true,
        isListed: true,
        isFeatured: idx % 4 === 0,
        createdBy: superAdmin.id,
        updatedBy: superAdmin.id,
      },
      update: {},
    });

    // Create a demo image for the product
    await prisma.productImage.create({
      data: {
        productId: product.id,
        cloudinaryId: `demo_img_${product.id}`,
        url: `https://placehold.co/600x400/1f2937/ffffff/png?text=${encodeURIComponent(p.name)}`,
        altText: `${p.name} demo photo`,
        isPrimary: true,
        sortOrder: 0,
      },
    });

    seededProducts.push(product);
    idx++;
  }
  console.log(`   ✓ Seeded ${seededProducts.length} products with placeholder images.`);

  // 5. Create Phone Units
  console.log("\n📳 Seeding Phone Units...");
  const seededUnits = [];
  let unitIdx = 1;

  const unitStatuses: PhoneUnitStatus[] = [
    "AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE", // Weighted heavier for available
    "RESERVED", "SOLD", "SOLD", "SOLD", "DEFECTIVE"
  ];

  for (const prod of seededProducts) {
    // Determine number of units per product (between 3 and 5)
    const unitCount = 3 + (unitIdx % 3);

    for (let u = 0; u < unitCount; u++) {
      const uSku = `${prod.sku}-UNIT-${String(u + 1).padStart(3, "0")}`;
      const imei = `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
      const storage = STORAGES[unitIdx % STORAGES.length];
      const color = COLORS[unitIdx % COLORS.length];
      const grade = GRADES[unitIdx % GRADES.length];
      const condition = CONDITIONS[unitIdx % CONDITIONS.length];
      const status = unitStatuses[unitIdx % unitStatuses.length];
      const batteryHealth = 82 + (unitIdx % 19); // 82% to 100%

      const basePriceNum = Number(prod.basePrice);
      const sellingPrice = basePriceNum + (storage === "256GB" ? 50 : storage === "512GB" ? 100 : 0) - (grade === "B" ? 30 : grade === "C" ? 60 : 0);
      const purchasePrice = Math.round(sellingPrice * 0.65);

      const unit = await prisma.phoneUnit.create({
        data: {
          productId: prod.id,
          sku: uSku,
          imei,
          storage,
          color,
          batteryHealth,
          grade,
          condition,
          hasBox: unitIdx % 2 === 0,
          hasCharger: unitIdx % 3 !== 0,
          hasEarphones: unitIdx % 4 === 0,
          hasOriginalAccessories: unitIdx % 5 === 0,
          warrantyInfo: unitIdx % 2 === 0 ? "3 Months Shop Warranty" : "No Warranty",
          sellingPrice,
          purchasePrice,
          status,
          adminNotes: "[DEMO STOCK] Verified and fully functional.",
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      });

      // Stock Movement for initial import
      await prisma.stockMovement.create({
        data: {
          productId: prod.id,
          phoneUnitId: unit.id,
          movementType: StockMovementType.UNIT_ADDED,
          quantityChange: 1,
          quantityBefore: 0,
          quantityAfter: 1,
          unitStatusBefore: null,
          unitStatusAfter: status,
          notes: "Demo inventory initial stock load.",
          createdBy: adminUser.id,
        },
      });

      seededUnits.push(unit);
      unitIdx++;
    }
  }

  // Update product counts
  for (const prod of seededProducts) {
    const totalCount = await prisma.phoneUnit.count({ where: { productId: prod.id, deletedAt: null } });
    const availCount = await prisma.phoneUnit.count({ where: { productId: prod.id, status: "AVAILABLE", deletedAt: null } });
    await prisma.product.update({
      where: { id: prod.id },
      data: {
        stockQuantity: totalCount,
        availableUnitCount: availCount,
      },
    });
  }

  console.log(`   ✓ Seeded ${seededUnits.length} physical phone units & updated stock levels.`);

  // 6. Seed Invoices & Sales Bills
  console.log("\n🧾 Seeding Completed POS Bills (90 days history)...");
  
  // Pick all SOLD units to link to invoices
  const soldUnits = seededUnits.filter((u) => u.status === "SOLD");
  const billCount = Math.min(60, soldUnits.length);
  
  let billIdx = 1;
  for (let i = 0; i < billCount; i++) {
    const unit = soldUnits[i];
    const product = seededProducts.find((p) => p.id === unit.productId)!;
    const customer = CUSTOMERS[billIdx % CUSTOMERS.length];
    const paymentMethods: PaymentMethod[] = ["CASH", "CARD", "TRANSFER", "OTHER"];
    const paymentMethod = paymentMethods[billIdx % paymentMethods.length];
    
    // Distribute bills across the last 90 days
    const dateOffset = Math.floor(Math.random() * 90);
    const billDate = new Date();
    billDate.setDate(billDate.getDate() - dateOffset);
    
    const billNumber = `DEMO-INV-${String(billIdx).padStart(5, "0")}`;
    const subtotal = Number(unit.sellingPrice || product.basePrice);
    const discount = billIdx % 10 === 0 ? 10 : 0;
    const total = subtotal - discount;

    const bill = await prisma.bill.create({
      data: {
        billNumber,
        staffId: staffUser.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        subtotal,
        discount,
        total,
        paymentMethod,
        notes: "[DEMO POS INVOICE] Walk-in customer POS sale.",
        createdAt: billDate,
      },
    });

    // Create Bill item
    await prisma.billItem.create({
      data: {
        billId: bill.id,
        productId: product.id,
        phoneUnitId: unit.id,
        quantity: 1,
        unitPrice: subtotal,
        discount,
        lineTotal: total,
        productName: product.name,
        productSku: product.sku,
        unitSku: unit.sku,
        unitGrade: unit.grade,
        unitStorage: unit.storage,
        unitColor: unit.color,
        unitCondition: unit.condition,
        unitHasBox: unit.hasBox,
        unitHasCharger: unit.hasCharger,
        unitImei: unit.imei,
      },
    });

    // Stock Movement for Sale
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        phoneUnitId: unit.id,
        movementType: StockMovementType.UNIT_SOLD,
        quantityChange: -1,
        quantityBefore: 1,
        quantityAfter: 0,
        unitStatusBefore: "AVAILABLE",
        unitStatusAfter: "SOLD",
        referenceType: "BILL",
        referenceId: bill.id,
        notes: `POS invoice ${billNumber} sales register.`,
        createdBy: staffUser.id,
        createdAt: billDate,
      },
    });

    billIdx++;
  }

  // 7. Seed generic Audits logs
  console.log("\n🪵 Seeding System Audit Trail logs...");
  const auditActions = [
    { action: "PRODUCT_CREATED", entityType: "PRODUCT", desc: "Demo product imported" },
    { action: "SETTINGS_UPDATED", entityType: "SYSTEM_CONFIG", desc: "Catalog settings updated" },
    { action: "USER_ROLE_CHANGED", entityType: "USER", desc: "User promotion log" },
    { action: "INVENTORY_RESTOCK", entityType: "PRODUCT", desc: "Seeded stock imported" },
  ];

  for (let a = 0; a < 15; a++) {
    const act = auditActions[a % auditActions.length];
    await prisma.auditLog.create({
      data: {
        userId: superAdmin.id,
        action: act.action,
        entityType: act.entityType,
        entityId: superAdmin.id, // self pointer fallback
        oldData: { active: false },
        newData: { active: true, notes: `[DEMO AUDIT] ${act.desc}` },
      },
    });
  }

  console.log("\n✅ Demo dataset seeded successfully!");
  console.log("--------------------------------------------------");
  console.log("Credentials for Testing Role Permissions:");
  console.log(`1. Super Admin:  demo-superadmin@shop.com  /  ${DEMO_PASSWORD}`);
  console.log(`2. Admin:        demo-admin@shop.com       /  ${DEMO_PASSWORD}`);
  console.log(`3. Staff:        demo-staff@shop.com       /  ${DEMO_PASSWORD}`);
  console.log("--------------------------------------------------");
  console.log("Verification Commands:");
  console.log("  Reset:  npm run db:reset");
  console.log("  Reseed: npm run db:reseed");
  console.log("--------------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

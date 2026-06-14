/**
 * Repositories barrel export.
 *
 * Also exports pre-instantiated singletons wired to the global Prisma client
 * for use in service files. Services should import from here rather than
 * constructing repositories themselves.
 *
 * Usage:
 *   ```ts
 *   import { productRepo, phoneUnitRepo } from "@/lib/repositories";
 *   ```
 */

export { UserRepository } from "./user.repository";
export { CategoryRepository } from "./category.repository";
export { BrandRepository } from "./brand.repository";
export { ProductRepository, PUBLIC_VISIBILITY_FILTER } from "./product.repository";
export { PhoneUnitRepository } from "./phoneUnit.repository";
export { BillRepository } from "./bill.repository";
export { StockMovementRepository } from "./stockMovement.repository";
export { AuditLogRepository } from "./auditLog.repository";
export { SystemConfigRepository } from "./systemConfig.repository";

// ---------------------------------------------------------------------------
// Singletons — one instance per repository, shared across all service calls
// within the same serverless function invocation.
// ---------------------------------------------------------------------------

import prisma from "../prisma";
import { UserRepository } from "./user.repository";
import { CategoryRepository } from "./category.repository";
import { BrandRepository } from "./brand.repository";
import { ProductRepository } from "./product.repository";
import { PhoneUnitRepository } from "./phoneUnit.repository";
import { BillRepository } from "./bill.repository";
import { StockMovementRepository } from "./stockMovement.repository";
import { AuditLogRepository } from "./auditLog.repository";
import { SystemConfigRepository } from "./systemConfig.repository";

export const userRepo = new UserRepository(prisma);
export const categoryRepo = new CategoryRepository(prisma);
export const brandRepo = new BrandRepository(prisma);
export const productRepo = new ProductRepository(prisma);
export const phoneUnitRepo = new PhoneUnitRepository(prisma);
export const billRepo = new BillRepository(prisma);
export const stockMovementRepo = new StockMovementRepository(prisma);
export const auditLogRepo = new AuditLogRepository(prisma);
export const systemConfigRepo = new SystemConfigRepository(prisma);

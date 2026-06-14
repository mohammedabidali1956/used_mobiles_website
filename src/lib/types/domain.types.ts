/**
 * Domain types derived from Prisma models.
 *
 * These types are shaped for application and API use. They are NOT the raw
 * Prisma model types (which include Prisma-specific fields and relation
 * loading behaviour). Instead, they represent the "plain object" shapes that
 * services return and route handlers serialise.
 *
 * Where types come directly from Prisma's generated types, we re-export them
 * to keep imports consistent across the application.
 */

import type {
  Role,
  Condition,
  Grade,
  PhoneUnitStatus,
  PaymentMethod,
  StockMovementType,
} from "@prisma/client";

// Re-export Prisma enums so the rest of the app can import them from one place
export type { Role, Condition, Grade, PhoneUnitStatus, PaymentMethod, StockMovementType };

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface UserDetail extends UserSummary {
  updatedAt: Date;
  createdById: string | null;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithChildren extends CategorySummary {
  children: CategorySummary[];
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export interface BrandSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Product Image
// ---------------------------------------------------------------------------

export interface ProductImageSummary {
  id: string;
  productId: string;
  cloudinaryId: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Product — public (browse-only)
// ---------------------------------------------------------------------------

export interface PublicProductSummary {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  categoryName: string;
  categorySlug: string;
  baseCondition: Condition;
  basePrice: number;
  compareAtPrice: number | null;
  availableUnitCount: number;
  isUnitTracked: boolean;
  primaryImageUrl: string | null;
}

export interface PublicProductDetail extends PublicProductSummary {
  description: string | null;
  specifications: Record<string, unknown>;
  images: ProductImageSummary[];
  units: PublicPhoneUnitSummary[];
  relatedProducts: PublicProductSummary[];
}

// ---------------------------------------------------------------------------
// Product — admin (includes internal fields)
// ---------------------------------------------------------------------------

export interface AdminProductSummary {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  baseCondition: Condition;
  basePrice: number;
  compareAtPrice: number | null;
  availableUnitCount: number;
  stockQuantity: number;
  isUnitTracked: boolean;
  isListed: boolean;
  visibilityOverride: boolean;
  isFeatured: boolean;
  internalNotes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AdminProductDetail extends AdminProductSummary {
  description: string | null;
  specifications: Record<string, unknown>;
  images: ProductImageSummary[];
  unitCountByStatus: Record<PhoneUnitStatus, number>;
}

// ---------------------------------------------------------------------------
// PhoneUnit — public (no IMEI, no purchase price)
// ---------------------------------------------------------------------------

export interface PublicPhoneUnitSummary {
  id: string;
  sku: string;
  grade: Grade | null;
  storage: string | null;
  color: string | null;
  condition: Condition;
  hasBox: boolean;
  hasCharger: boolean;
  hasEarphones: boolean;
  hasOriginalAccessories: boolean;
  warrantyInfo: string | null;
  sellingPrice: number | null;
  /**
   * Only present when system_config `show_battery_health_public = true`.
   * The service sets this to null when the config is off.
   */
  batteryHealth: number | null;
}

// ---------------------------------------------------------------------------
// PhoneUnit — admin (includes IMEI, purchase price, soft-delete fields)
// ---------------------------------------------------------------------------

export interface AdminPhoneUnitDetail {
  id: string;
  productId: string;
  sku: string;
  imei: string | null;
  storage: string | null;
  color: string | null;
  batteryHealth: number | null;
  grade: Grade | null;
  condition: Condition;
  hasBox: boolean;
  hasCharger: boolean;
  hasEarphones: boolean;
  hasOriginalAccessories: boolean;
  warrantyInfo: string | null;
  sellingPrice: number | null;
  purchasePrice: number | null;
  status: PhoneUnitStatus;
  adminNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string;
  updatedBy: string;
}

// ---------------------------------------------------------------------------
// PhoneUnit — billing panel (public + battery health always, never IMEI/purchase_price)
// ---------------------------------------------------------------------------

export interface BillingPhoneUnitSummary {
  id: string;
  sku: string;
  grade: Grade | null;
  storage: string | null;
  color: string | null;
  condition: Condition;
  hasBox: boolean;
  hasCharger: boolean;
  hasEarphones: boolean;
  warrantyInfo: string | null;
  sellingPrice: number | null;
  batteryHealth: number | null;
}

// ---------------------------------------------------------------------------
// Bill
// ---------------------------------------------------------------------------

export interface BillItemDetail {
  id: string;
  productId: string;
  phoneUnitId: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  productName: string;
  productSku: string;
  unitSku: string | null;
  unitGrade: string | null;
  unitStorage: string | null;
  unitColor: string | null;
  unitCondition: string | null;
  unitHasBox: boolean | null;
  unitHasCharger: boolean | null;
  /**
   * IMEI — included in admin/SUPER_ADMIN bill detail responses only.
   * Set to null in staff-facing responses.
   */
  unitImei: string | null;
}

export interface BillSummary {
  id: string;
  billNumber: string;
  staffId: string;
  staffName: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: Date;
}

export interface BillDetail extends BillSummary {
  items: BillItemDetail[];
}

// ---------------------------------------------------------------------------
// Stock Movement
// ---------------------------------------------------------------------------

export interface StockMovementSummary {
  id: string;
  productId: string;
  phoneUnitId: string | null;
  movementType: StockMovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitStatusBefore: string | null;
  unitStatusAfter: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export interface AuditLogSummary {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: unknown | null;
  newData: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// System Config
// ---------------------------------------------------------------------------

export interface SystemConfigEntry {
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

// ---------------------------------------------------------------------------
// NextAuth session extension
// ---------------------------------------------------------------------------

/**
 * The shape of the user object that we store in the JWT and expose via
 * `session.user`. Extends the NextAuth default `User`.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

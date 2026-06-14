/**
 * Billing domain validators.
 */

import { z } from "zod";
import { zMoney, zOptionalString, zPaginationQuery, zUuid } from "./shared";

// ---------------------------------------------------------------------------
// Enum mirrors
// ---------------------------------------------------------------------------

export const zPaymentMethod = z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]);
export type PaymentMethod = z.infer<typeof zPaymentMethod>;

// ---------------------------------------------------------------------------
// Bill item — unit-tracked (phone)
// ---------------------------------------------------------------------------

const zUnitTrackedBillItem = z.object({
  productId: zUuid,
  phoneUnitId: zUuid,
  /** Quantity is always 1 for unit-tracked items. */
  quantity: z.literal(1).optional().default(1),
  unitPrice: zMoney,
  discount: zMoney.optional().default(0),
});

// ---------------------------------------------------------------------------
// Bill item — generic (accessory / non-unit-tracked)
// ---------------------------------------------------------------------------

const zGenericBillItem = z.object({
  productId: zUuid,
  phoneUnitId: z.null().optional(),
  quantity: z.number().int().positive("Quantity must be at least 1."),
  unitPrice: zMoney,
  discount: zMoney.optional().default(0),
});

// ---------------------------------------------------------------------------
// Union — discriminated by presence of phoneUnitId
// ---------------------------------------------------------------------------

export const zBillItem = z.discriminatedUnion("phoneUnitId", [
  zUnitTrackedBillItem.extend({ phoneUnitId: zUuid }),
  zGenericBillItem.extend({ phoneUnitId: z.null() }),
]);

export type BillItem = z.infer<typeof zBillItem>;

// ---------------------------------------------------------------------------
// Create bill
// ---------------------------------------------------------------------------

export const zCreateBillBody = z.object({
  items: z
    .array(zBillItem)
    .min(1, "A bill must have at least one item."),
  discount: zMoney.optional().default(0),
  paymentMethod: zPaymentMethod,
  customerName: zOptionalString,
  customerPhone: zOptionalString,
  notes: zOptionalString,
});

export type CreateBillBody = z.infer<typeof zCreateBillBody>;

// ---------------------------------------------------------------------------
// Billing product search
// ---------------------------------------------------------------------------

export const zBillingSearchQuery = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Search query must be at least 2 characters."),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform(Number)
    .pipe(z.number().int().min(1).max(50)),
});

export type BillingSearchQuery = z.infer<typeof zBillingSearchQuery>;

// ---------------------------------------------------------------------------
// Staff list own bills query
// ---------------------------------------------------------------------------

export const zListBillsQuery = zPaginationQuery.extend({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  staffId: z.string().uuid().optional(),
});

export type ListBillsQuery = z.infer<typeof zListBillsQuery>;

// ---------------------------------------------------------------------------
// Path param
// ---------------------------------------------------------------------------

export const zBillIdParam = z.object({ id: zUuid });

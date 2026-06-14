"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUnitAction, updateUnitAction } from "./actions";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface InventoryFormProps {
  products?: ProductOption[]; // Required only on Create
  initialValues?: {
    id: string;
    productId: string;
    sku: string;
    imei: string | null;
    storage: string | null;
    color: string | null;
    batteryHealth: number | null;
    grade: string | null;
    condition: string;
    hasBox: boolean;
    hasCharger: boolean;
    hasEarphones: boolean;
    hasOriginalAccessories: boolean;
    warrantyInfo: string | null;
    sellingPrice: number | null;
    purchasePrice: number | null;
    adminNotes: string | null;
  };
  isEdit?: boolean;
}

export default function InventoryForm({
  products = [],
  initialValues,
  isEdit = false,
}: InventoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Input states
  const [productId, setProductId] = useState(initialValues?.productId || "");
  const [sku, setSku] = useState(initialValues?.sku || "");
  const [imei, setImei] = useState(initialValues?.imei || "");
  const [storage, setStorage] = useState(initialValues?.storage || "");
  const [color, setColor] = useState(initialValues?.color || "");
  const [batteryHealth, setBatteryHealth] = useState(initialValues?.batteryHealth?.toString() || "");
  const [grade, setGrade] = useState(initialValues?.grade || "");
  const [condition, setCondition] = useState(initialValues?.condition || "GOOD");
  const [hasBox, setHasBox] = useState(initialValues?.hasBox ?? false);
  const [hasCharger, setHasCharger] = useState(initialValues?.hasCharger ?? false);
  const [hasEarphones, setHasEarphones] = useState(initialValues?.hasEarphones ?? false);
  const [hasOriginalAccessories, setHasOriginalAccessories] = useState(initialValues?.hasOriginalAccessories ?? false);
  const [warrantyInfo, setWarrantyInfo] = useState(initialValues?.warrantyInfo || "");
  const [sellingPrice, setSellingPrice] = useState(initialValues?.sellingPrice?.toString() || "");
  const [purchasePrice, setPurchasePrice] = useState(initialValues?.purchasePrice?.toString() || "");
  const [adminNotes, setAdminNotes] = useState(initialValues?.adminNotes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError(null);
    setFieldErrors({});

    // Process inputs
    const batHealth = batteryHealth.trim() ? parseInt(batteryHealth) : undefined;
    const sellPrice = sellingPrice.trim() ? Number(sellingPrice) : undefined;
    const buyPrice = purchasePrice.trim() ? Number(purchasePrice) : undefined;

    const dataPayload: Record<string, any> = {
      storage: storage.trim() || null,
      color: color.trim() || null,
      batteryHealth: batHealth,
      grade: grade || null,
      condition,
      hasBox,
      hasCharger,
      hasEarphones,
      hasOriginalAccessories,
      warrantyInfo: warrantyInfo.trim() || null,
      sellingPrice: sellPrice,
      purchasePrice: buyPrice,
      adminNotes: adminNotes.trim() || null,
    };

    let res;
    if (isEdit && initialValues?.id) {
      res = await updateUnitAction(initialValues.id, dataPayload);
    } else {
      // Add SKU and IMEI only on creation
      if (sku.trim()) dataPayload.sku = sku.trim();
      if (imei.trim()) dataPayload.imei = imei.trim();
      res = await createUnitAction(productId, dataPayload);
    }

    if (res.success) {
      router.push(`/admin/inventory/${res.unit.id}`);
      router.refresh();
    } else {
      setServerError(res.error || "An error occurred.");
      if ("details" in res && res.details) {
        setFieldErrors(res.details as Record<string, string[]>);
      }
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {serverError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {serverError}
        </div>
      )}

      {/* Product & Identifiers Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
          Model & Codes
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Product Model Selector */}
          <div>
            <label htmlFor="form-prod-id" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Attached Product Model *
            </label>
            {isEdit ? (
              <div className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-900/20 px-3.5 py-2 text-sm text-zinc-400">
                Disabled during Edit
              </div>
            ) : (
              <select
                id="form-prod-id"
                required
                disabled={loading}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select Product Model</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.productId && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.productId[0]}</p>
            )}
          </div>

          {/* SKU */}
          <div>
            <label htmlFor="form-sku" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Unit Code (SKU)
            </label>
            <input
              id="form-sku"
              type="text"
              disabled={isEdit || loading}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.sku ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50`}
            />
            {fieldErrors.sku && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.sku[0]}</p>
            )}
          </div>

          {/* IMEI */}
          {!isEdit && (
            <div>
              <label htmlFor="form-imei" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                IMEI (14-15 Digits)
              </label>
              <input
                id="form-imei"
                type="text"
                disabled={loading}
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="e.g. 351234567890123"
                className={`mt-2 block w-full rounded-lg border ${
                  fieldErrors.imei ? "border-red-500/50" : "border-zinc-800"
                } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
              />
              {fieldErrors.imei && (
                <p className="mt-1 text-xs text-red-400">{fieldErrors.imei[0]}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Specifications & Condition Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
          Specs & Hardware
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Storage */}
          <div>
            <label htmlFor="form-storage" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Storage Capacity
            </label>
            <input
              id="form-storage"
              type="text"
              disabled={loading}
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
              placeholder="e.g. 128GB, 256GB"
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Color */}
          <div>
            <label htmlFor="form-color" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Color
            </label>
            <input
              id="form-color"
              type="text"
              disabled={loading}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Graphite, Deep Purple"
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Battery Health */}
          <div>
            <label htmlFor="form-battery" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Battery Health (%)
            </label>
            <input
              id="form-battery"
              type="number"
              min="0"
              max="100"
              disabled={loading}
              value={batteryHealth}
              onChange={(e) => setBatteryHealth(e.target.value)}
              placeholder="e.g. 88"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.batteryHealth ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
            />
            {fieldErrors.batteryHealth && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.batteryHealth[0]}</p>
            )}
          </div>

          {/* Grade */}
          <div>
            <label htmlFor="form-grade" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Grade
            </label>
            <select
              id="form-grade"
              disabled={loading}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select Grade</option>
              <option value="S">S (Brand New)</option>
              <option value="A_PLUS">A+ (Pristine)</option>
              <option value="A">A (Very Good)</option>
              <option value="B">B (Good)</option>
              <option value="C">C (Fair)</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label htmlFor="form-condition" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Condition *
            </label>
            <select
              id="form-condition"
              required
              disabled={loading}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="NEW">New (Factory Sealed)</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good Condition</option>
              <option value="FAIR">Fair Condition</option>
            </select>
          </div>

          {/* Accessories checkboxes */}
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Included Accessories
            </span>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={hasBox}
                  onChange={(e) => setHasBox(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                Box
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={hasCharger}
                  onChange={(e) => setHasCharger(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                Charger
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={hasEarphones}
                  onChange={(e) => setHasEarphones(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                Earphones
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={hasOriginalAccessories}
                  onChange={(e) => setHasOriginalAccessories(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                />
                Original Access.
              </label>
            </div>
          </div>

          {/* Warranty Info */}
          <div className="sm:col-span-2">
            <label htmlFor="form-warranty" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Warranty Information
            </label>
            <input
              id="form-warranty"
              type="text"
              disabled={loading}
              value={warrantyInfo}
              onChange={(e) => setWarrantyInfo(e.target.value)}
              placeholder="e.g. 6-month store warranty, 2026-12 AppleCare"
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Pricing & Notes Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
          Pricing & Administration
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Selling Price */}
          <div>
            <label htmlFor="form-selling-price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Selling Price ($)
            </label>
            <input
              id="form-selling-price"
              type="number"
              step="0.01"
              disabled={loading}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="e.g. 599.99"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.sellingPrice ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
            />
            {fieldErrors.sellingPrice && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.sellingPrice[0]}</p>
            )}
          </div>

          {/* Purchase Price */}
          <div>
            <label htmlFor="form-purchase-price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Purchase Cost ($)
            </label>
            <input
              id="form-purchase-price"
              type="number"
              step="0.01"
              disabled={loading}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="e.g. 400.00"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.purchasePrice ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
            />
            {fieldErrors.purchasePrice && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.purchasePrice[0]}</p>
            )}
          </div>

          {/* Admin Notes */}
          <div className="sm:col-span-2">
            <label htmlFor="form-admin-notes" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Administrative Notes
            </label>
            <textarea
              id="form-admin-notes"
              rows={4}
              disabled={loading}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes for inventory tracking..."
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          id="inventory-form-submit"
          type="submit"
          disabled={loading || (!isEdit && !productId)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-3 w-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving Unit...
            </>
          ) : (
            isEdit ? "Update Unit" : "Create Phone Unit"
          )}
        </button>
      </div>
    </form>
  );
}

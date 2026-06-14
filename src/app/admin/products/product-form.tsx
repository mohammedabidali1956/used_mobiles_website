"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction, updateProductAction } from "./actions";

interface Option {
  id: string;
  name: string;
}

interface SpecRow {
  key: string;
  value: string;
}

interface ProductFormProps {
  brands: Option[];
  categories: Option[];
  initialValues?: {
    id?: string;
    sku: string;
    name: string;
    slug: string;
    brandId: string;
    categoryId: string;
    baseCondition: string;
    basePrice: number;
    compareAtPrice: number | null;
    isUnitTracked: boolean;
    isFeatured: boolean;
    description: string | null;
    internalNotes: string | null;
    specifications: Record<string, any>;
    version?: number;
  };
  isEdit?: boolean;
}

export default function ProductForm({
  brands,
  categories,
  initialValues,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Input states
  const [sku, setSku] = useState(initialValues?.sku || "");
  const [name, setName] = useState(initialValues?.name || "");
  const [slug, setSlug] = useState(initialValues?.slug || "");
  const [brandId, setBrandId] = useState(initialValues?.brandId || "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId || "");
  const [baseCondition, setBaseCondition] = useState(initialValues?.baseCondition || "GOOD");
  const [basePrice, setBasePrice] = useState(initialValues?.basePrice?.toString() || "");
  const [compareAtPrice, setCompareAtPrice] = useState(initialValues?.compareAtPrice?.toString() || "");
  const [isUnitTracked, setIsUnitTracked] = useState(initialValues?.isUnitTracked ?? true);
  const [isFeatured, setIsFeatured] = useState(initialValues?.isFeatured ?? false);
  const [description, setDescription] = useState(initialValues?.description || "");
  const [internalNotes, setInternalNotes] = useState(initialValues?.internalNotes || "");

  // Specifications state (dynamic rows)
  const initialSpecs: SpecRow[] = initialValues?.specifications
    ? Object.entries(initialValues.specifications).map(([key, value]) => ({
        key,
        value: String(value),
      }))
    : [{ key: "", value: "" }];
  const [specs, setSpecs] = useState<SpecRow[]>(initialSpecs);

  // Auto-generate slug from name
  const handleGenerateSlug = () => {
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces/hyphens
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/-+/g, "-"); // merge multiple hyphens
    setSlug(generated);
    if (fieldErrors.slug) {
      const { slug: _, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  const handleAddSpecRow = () => {
    setSpecs([...specs, { key: "", value: "" }]);
  };

  const handleRemoveSpecRow = (index: number) => {
    setSpecs(specs.filter((_, idx) => idx !== index));
  };

  const handleSpecChange = (index: number, field: keyof SpecRow, value: string) => {
    const newSpecs = [...specs];
    newSpecs[index][field] = value;
    setSpecs(newSpecs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setServerError(null);
    setFieldErrors({});

    // Process inputs
    const bPrice = basePrice.trim() ? Number(basePrice) : NaN;
    const cPrice = compareAtPrice.trim() ? Number(compareAtPrice) : null;

    // Convert spec rows to Json record
    const finalSpecs: Record<string, string> = {};
    specs.forEach((row) => {
      if (row.key.trim() && row.value.trim()) {
        finalSpecs[row.key.trim()] = row.value.trim();
      }
    });

    const dataPayload: Record<string, any> = {
      sku: sku.trim(),
      name: name.trim(),
      slug: slug.trim(),
      brandId,
      categoryId,
      baseCondition,
      basePrice: bPrice,
      compareAtPrice: cPrice,
      isUnitTracked,
      isFeatured,
      description: description.trim() || null,
      internalNotes: internalNotes.trim() || null,
      specifications: finalSpecs,
    };

    let res;
    if (isEdit && initialValues?.id) {
      // Add version tag for optimistic locking on update
      dataPayload.version = initialValues.version;
      res = await updateProductAction(initialValues.id, dataPayload);
    } else {
      res = await createProductAction(dataPayload);
    }

    if (res.success && "product" in res && res.product) {
      router.push(`/admin/products/${res.product.id}`);
      router.refresh();
    } else {
      const errorResponse = res as { error?: string; details?: Record<string, string[]> };
      setServerError(errorResponse.error || "An error occurred.");
      if (errorResponse.details) {
        setFieldErrors(errorResponse.details);
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

      {/* Main Info Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
          {isEdit ? "Edit General Info" : "General Information"}
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* SKU */}
          <div>
            <label htmlFor="form-sku" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              SKU (Product Code) *
            </label>
            <input
              id="form-sku"
              type="text"
              required
              disabled={isEdit || loading} // SKU cannot be modified on edit per requirements
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SAMSUNG-S23-ULTRA"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.sku ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50`}
            />
            {fieldErrors.sku && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.sku[0]}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="form-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Product Name *
            </label>
            <input
              id="form-name"
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Samsung Galaxy S23 Ultra"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.name ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Slug */}
          <div className="sm:col-span-2">
            <label htmlFor="form-slug" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              URL Slug *
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="form-slug"
                type="text"
                required
                disabled={loading}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. samsung-galaxy-s23-ultra"
                className={`block w-full rounded-lg border ${
                  fieldErrors.slug ? "border-red-500/50" : "border-zinc-800"
                } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
              />
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="rounded-lg bg-zinc-800 px-4 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors whitespace-nowrap"
              >
                Auto-Generate
              </button>
            </div>
            {fieldErrors.slug && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.slug[0]}</p>
            )}
            <p className="mt-1 text-[11px] text-zinc-500">
              Safe lowercase string containing letters, numbers, and hyphens.
            </p>
          </div>

          {/* Brand */}
          <div>
            <label htmlFor="form-brand" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Brand *
            </label>
            <select
              id="form-brand"
              required
              disabled={loading}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select Brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {fieldErrors.brandId && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.brandId[0]}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="form-category" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Category *
            </label>
            <select
              id="form-category"
              required
              disabled={loading}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.categoryId[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing & Stock Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
          Pricing & Configuration
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Base Price */}
          <div>
            <label htmlFor="form-price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Base Price ($) *
            </label>
            <input
              id="form-price"
              type="number"
              step="0.01"
              required
              disabled={loading}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="e.g. 899.99"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.basePrice ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
            />
            {fieldErrors.basePrice && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.basePrice[0]}</p>
            )}
          </div>

          {/* Compare At Price */}
          <div>
            <label htmlFor="form-compare-price" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Compare-At Price ($)
            </label>
            <input
              id="form-compare-price"
              type="number"
              step="0.01"
              disabled={loading}
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              placeholder="e.g. 999.99"
              className={`mt-2 block w-full rounded-lg border ${
                fieldErrors.compareAtPrice ? "border-red-500/50" : "border-zinc-800"
              } bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none`}
            />
            {fieldErrors.compareAtPrice && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.compareAtPrice[0]}</p>
            )}
          </div>

          {/* Base Condition */}
          <div>
            <label htmlFor="form-condition" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Base Condition *
            </label>
            <select
              id="form-condition"
              required
              disabled={loading}
              value={baseCondition}
              onChange={(e) => setBaseCondition(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="NEW">New (Factory Sealed)</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good Condition</option>
              <option value="FAIR">Fair Condition</option>
            </select>
            {fieldErrors.baseCondition && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.baseCondition[0]}</p>
            )}
          </div>

          {/* Switches */}
          <div className="flex flex-col justify-center gap-4">
            {/* Unit Tracked Checkbox */}
            <div className="flex items-center gap-3">
              <input
                id="form-unit-tracked"
                type="checkbox"
                disabled={loading}
                checked={isUnitTracked}
                onChange={(e) => setIsUnitTracked(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="form-unit-tracked" className="text-sm font-semibold text-zinc-300">
                Track Individual Phone Units
              </label>
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center gap-3">
              <input
                id="form-featured"
                type="checkbox"
                disabled={loading}
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="form-featured" className="text-sm font-semibold text-zinc-300">
                Feature Product in Storefront
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Notes */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-6">
        <h2 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">
          Specifications & Detail Notes
        </h2>

        {/* Description */}
        <div>
          <label htmlFor="form-desc" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Public Description
          </label>
          <textarea
            id="form-desc"
            rows={4}
            disabled={loading}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Introduce this product model, core specs, or features..."
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Dynamic Specifications */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Custom Specifications
          </span>
          <div className="mt-3 space-y-3">
            {specs.map((row, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Key (e.g. Storage)"
                  value={row.key}
                  onChange={(e) => handleSpecChange(index, "key", e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. 256GB)"
                  value={row.value}
                  onChange={(e) => handleSpecChange(index, "value", e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSpecRow(index)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                  title="Remove row"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddSpecRow}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Row
            </button>
          </div>
        </div>

        {/* Internal Notes */}
        <div>
          <label htmlFor="form-internal-notes" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Internal Administrative Notes
          </label>
          <textarea
            id="form-internal-notes"
            rows={3}
            disabled={loading}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Add internal comments (pricing guidelines, source notes)..."
            className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
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
          id="product-form-submit"
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-3 w-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving Product...
            </>
          ) : (
            isEdit ? "Update Product" : "Create Product"
          )}
        </button>
      </div>
    </form>
  );
}

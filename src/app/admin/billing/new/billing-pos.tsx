"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchAvailableUnitsAction, createBillAction } from "@/app/billing/actions";

interface CartItem {
  id: string; // unitId
  productId: string;
  sku: string; // unit SKU
  productName: string;
  productSku: string;
  storage: string | null;
  color: string | null;
  grade: string | null;
  condition: string;
  originalPrice: number;
  unitPrice: number; // Editable
  discount: number; // Editable
}

interface SearchedUnit {
  id: string;
  sku: string;
  productId: string;
  storage: string | null;
  color: string | null;
  grade: string | null;
  condition: string;
  sellingPrice: number | null;
  product: {
    name: string;
    sku: string;
  };
}

export default function BillingPos() {
  const router = useRouter();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUnits, setSearchedUnits] = useState<SearchedUnit[]>([]);
  const [searching, setSearching] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer & Bill options
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "OTHER">("CASH");
  const [notes, setNotes] = useState("");
  const [billDiscountStr, setBillDiscountStr] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Debounced available units search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchedUnits([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const res = await searchAvailableUnitsAction(searchQuery.trim());
        if (res.success && res.units) {
          setSearchedUnits(res.units as SearchedUnit[]);
        } else if ("error" in res) {
          setError(res.error || "Failed to search inventory.");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred during search.");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addToCart = (unit: SearchedUnit) => {
    // Check if already in cart
    if (cart.some((item) => item.id === unit.id)) return;

    const basePrice = unit.sellingPrice || 0;
    const newItem: CartItem = {
      id: unit.id,
      productId: unit.productId,
      sku: unit.sku,
      productName: unit.product.name,
      productSku: unit.product.sku,
      storage: unit.storage,
      color: unit.color,
      grade: unit.grade,
      condition: unit.condition,
      originalPrice: basePrice,
      unitPrice: basePrice,
      discount: 0,
    };

    setCart([...cart, newItem]);
    setSearchQuery(""); // Clear search
    setSearchedUnits([]);
  };

  const removeFromCart = (unitId: string) => {
    setCart(cart.filter((item) => item.id !== unitId));
  };

  const updateItemPrice = (unitId: string, price: number) => {
    setCart(
      cart.map((item) =>
        item.id === unitId ? { ...item, unitPrice: isNaN(price) ? 0 : price } : item
      )
    );
  };

  const updateItemDiscount = (unitId: string, disc: number) => {
    setCart(
      cart.map((item) =>
        item.id === unitId ? { ...item, discount: isNaN(disc) ? 0 : disc } : item
      )
    );
  };

  // Live total calculations
  const totalItemLinePrice = cart.reduce((sum, item) => sum + item.unitPrice, 0);
  const totalItemLineDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const cartSubtotal = Math.max(0, totalItemLinePrice - totalItemLineDiscount);
  
  const headerDiscount = billDiscountStr.trim() ? Number(billDiscountStr) : 0;
  const finalTotal = Math.max(0, cartSubtotal - (isNaN(headerDiscount) ? 0 : headerDiscount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Please add at least one phone unit to the bill.");
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    const dataPayload = {
      items: cart.map((item) => ({
        productId: item.productId,
        phoneUnitId: item.id,
        quantity: 1,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
      discount: isNaN(headerDiscount) ? 0 : headerDiscount,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await createBillAction(dataPayload);
      if (res.success) {
        router.push(`/admin/billing/${res.billId}`);
        router.refresh();
      } else {
        setError(res.error || "Failed to create invoice.");
        if ("details" in res && res.details) {
          setFieldErrors(res.details as Record<string, string[]>);
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while saving the bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
      {/* Left Columns (Inventory search & Cart items) */}
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Available units search card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-2">
            Search Inventory Stock
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Start typing SKU code or color to search active stock..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={saving}
              className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            {searching && (
              <div className="absolute right-3.5 top-3.5">
                <svg className="h-4 w-4 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>

          {/* Search Dropdown / Autocomplete Results */}
          {searchedUnits.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 max-h-60 overflow-y-auto divide-y divide-zinc-900 shadow-xl">
              {searchedUnits.map((unit) => {
                const alreadyInCart = cart.some((item) => item.id === unit.id);
                return (
                  <div key={unit.id} className="flex items-center justify-between p-3.5 text-xs text-zinc-300 hover:bg-zinc-900/45 transition-colors">
                    <div>
                      <div className="font-semibold text-white font-mono">{unit.sku}</div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        {unit.product.name} — {unit.storage || "N/A"} / {unit.color || "N/A"}
                      </div>
                      <div className="mt-1 flex gap-1 items-center">
                        <span className="bg-zinc-800 px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider text-zinc-400">
                          {unit.condition}
                        </span>
                        {unit.grade && (
                          <span className="border border-indigo-500/20 bg-indigo-500/5 px-1 rounded text-[9px] text-indigo-400">
                            Grade: {unit.grade.replace("_", "+")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white font-mono">
                        ${unit.sellingPrice?.toLocaleString() || "0.00"}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(unit)}
                        disabled={alreadyInCart}
                        className={`rounded px-2.5 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                          alreadyInCart
                            ? "bg-zinc-900 text-zinc-600 border border-zinc-800"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {alreadyInCart ? "Added" : "Add to Bill"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {searchQuery.trim().length >= 2 && !searching && searchedUnits.length === 0 && (
            <p className="text-xs text-zinc-500 italic">No available stock units matched your search query.</p>
          )}
        </div>

        {/* Selected bill items card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-2">
            Selected Invoice Items ({cart.length})
          </h2>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <svg className="h-8 w-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-3 text-xs font-semibold text-zinc-400">No Items Added</h3>
              <p className="mt-1 text-[11px] text-zinc-600 max-w-xs">
                Search available stock above and click "Add to Bill" to include inventory units in this invoice.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="relative rounded-lg border border-zinc-800/80 bg-zinc-950 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-zinc-400 text-[10px] block font-semibold">{item.sku}</span>
                    <span className="font-bold text-white text-xs block leading-tight">{item.productName}</span>
                    <span className="text-[10px] text-zinc-500 block">
                      {item.storage || "N/A"} • {item.color || "N/A"} • Grade {item.grade?.replace("_", "+") || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Price Override */}
                    <div className="w-24">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Unit Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value))}
                        disabled={saving}
                        className="mt-1.5 block w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono text-right"
                      />
                    </div>

                    {/* Unit Discount */}
                    <div className="w-24">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Discount ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount === 0 ? "" : item.discount}
                        onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value))}
                        disabled={saving}
                        className="mt-1.5 block w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 font-mono text-right"
                      />
                    </div>

                    {/* Line total */}
                    <div className="text-right w-20">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Line Total</span>
                      <span className="block mt-2.5 font-bold font-mono text-white text-xs">
                        ${Math.max(0, item.unitPrice - item.discount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      disabled={saving}
                      className="mt-4 rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove Item"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column (Customer & Pricing summary card) */}
      <div className="space-y-6">
        {/* Customer & payment details card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-5">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-2">
            Customer & POS Details
          </h2>

          <div className="space-y-4 text-xs">
            {/* Customer Name */}
            <div>
              <label htmlFor="bill-cust-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Customer Name
              </label>
              <input
                id="bill-cust-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={saving}
                placeholder="Walk-in Customer"
                className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label htmlFor="bill-cust-phone" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Customer Phone
              </label>
              <input
                id="bill-cust-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={saving}
                placeholder="e.g. +91 98765 43210"
                className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Payment Method *
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["CASH", "CARD", "TRANSFER", "OTHER"] as const).map((method) => (
                  <label
                    key={method}
                    className={`flex items-center justify-center rounded-lg border p-3 font-semibold text-center cursor-pointer transition-all ${
                      paymentMethod === method
                        ? "border-indigo-500 bg-indigo-500/10 text-white font-bold"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      disabled={saving}
                      className="sr-only"
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            {/* Admin/POS notes */}
            <div>
              <label htmlFor="bill-notes" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Administrative Notes
              </label>
              <textarea
                id="bill-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
                placeholder="Include details about sales overrides, extra accessories..."
                className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-md backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-2">
            Invoice running total
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400 font-medium">Gross Subtotal</span>
              <span className="font-mono text-zinc-300 font-medium">
                ${totalItemLinePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between text-rose-400">
              <span>Item-Level Discounts</span>
              <span className="font-mono font-medium">
                -${totalItemLineDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-zinc-400 font-medium">Net Subtotal</span>
              <span className="font-mono text-zinc-300 font-medium">
                ${cartSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Header Discount Input */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bill-header-discount" className="block text-zinc-400 font-medium">
                  Add Header Discount ($)
                </label>
                {fieldErrors.discount && (
                  <span className="text-[10px] text-red-400">{fieldErrors.discount[0]}</span>
                )}
              </div>
              <input
                id="bill-header-discount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={billDiscountStr}
                onChange={(e) => setBillDiscountStr(e.target.value)}
                disabled={saving || cart.length === 0}
                className="mt-2 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none font-mono text-right"
              />
            </div>

            {/* Final Payable Amount */}
            <div className="flex justify-between border-t border-zinc-800/80 pt-4 text-sm font-bold">
              <span className="text-white font-extrabold uppercase tracking-wide">Final Payable</span>
              <span className="font-mono text-white text-base">
                ${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-bill"
              type="submit"
              disabled={saving || cart.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="h-3 w-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Save & Bill POS"
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

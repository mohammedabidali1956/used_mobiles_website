"use client";

import { useState } from "react";
import Link from "next/link";
import { ReceiptData } from "@/lib/services/billing.service";

interface ReceiptViewProps {
  receipt: ReceiptData;
}

type ViewMode = "invoice" | "thermal";

export default function ReceiptView({ receipt }: ReceiptViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("invoice");

  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = receipt.shop.currencySymbol || "$";

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Top Controls: Hidden on print */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/billing/${receipt.billId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoice
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Receipt Preview</h1>
            <p className="text-xs text-zinc-400">Generate or print copy of POS Bill</p>
          </div>
        </div>

        {/* View Mode Toggle & Print Button */}
        <div className="flex items-center gap-3">
          {/* Toggle buttons */}
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            <button
              onClick={() => setViewMode("invoice")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "invoice"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Invoice (A4)
            </button>
            <button
              onClick={() => setViewMode("thermal")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "thermal"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Thermal (80mm)
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" />
            </svg>
            Print Receipt
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex justify-center py-4 px-2 print:p-0 print:bg-transparent">
        {viewMode === "invoice" ? (
          /* ========================================================================= */
          /* STANDARD A4 INVOICE LAYOUT                                                */
          /* ========================================================================= */
          <div className="w-full max-w-4xl bg-white text-zinc-900 border border-zinc-200 rounded-xl shadow-xl p-8 sm:p-12 font-sans print:shadow-none print:border-none print:p-0 print:max-w-none">
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between gap-6 pb-8 border-b border-zinc-200 print:flex-row">
              <div className="space-y-2">
                <div className="text-xl font-bold uppercase tracking-tight text-indigo-700 font-mono">
                  {receipt.shop.name}
                </div>
                <div className="text-xs text-zinc-500 max-w-sm whitespace-pre-line leading-relaxed">
                  {receipt.shop.address}
                </div>
                <div className="text-xs text-zinc-500 space-y-0.5">
                  {receipt.shop.phone && <div>Phone: {receipt.shop.phone}</div>}
                  {receipt.shop.whatsapp && <div>WhatsApp: {receipt.shop.whatsapp}</div>}
                </div>
              </div>

              <div className="text-left md:text-right print:text-right space-y-1">
                <div className="inline-block rounded bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 tracking-wide uppercase border border-indigo-100">
                  POS INVOICE
                </div>
                <div className="text-lg font-bold font-mono text-zinc-800">{receipt.billNumber}</div>
                <div className="text-xs text-zinc-500">
                  Date: <span className="font-semibold text-zinc-700">{formatDate(receipt.createdAt)}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  Payment: <span className="font-semibold text-zinc-700">{receipt.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Customer & Staff Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-zinc-100 print:grid-cols-2">
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Customer Details</h3>
                <div className="text-sm font-bold text-zinc-800">
                  {receipt.customerName || <span className="text-zinc-400 italic">Walk-in Customer</span>}
                </div>
                {receipt.customerPhone && (
                  <div className="text-xs font-mono text-zinc-600">Ph: {receipt.customerPhone}</div>
                )}
              </div>

              <div className="space-y-1.5 text-left md:text-right print:text-right">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Issued By</h3>
                <div className="text-sm font-semibold text-zinc-800">{receipt.staffName}</div>
                <div className="text-xs text-zinc-500">Store Representative</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-6 overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="py-3 pr-4">Description / Hardware Specs</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 pl-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {receipt.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 print:hover:bg-transparent">
                      {/* Name & Specs */}
                      <td className="py-4 pr-4">
                        <div className="font-semibold text-zinc-900">{item.productName}</div>
                        <div className="mt-1 text-[10px] text-zinc-500 font-mono flex flex-wrap gap-x-2 gap-y-0.5">
                          {item.unitSku && <span>SKU: {item.unitSku}</span>}
                          {item.unitStorage && <span>• {item.unitStorage}</span>}
                          {item.unitColor && <span>• {item.unitColor}</span>}
                          {item.unitCondition && (
                            <span className="uppercase font-semibold text-zinc-600">
                              • {item.unitCondition} {item.unitGrade ? `(Grade ${item.unitGrade.replace("_", "+")})` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="py-4 px-4 text-center font-medium text-zinc-800">{item.quantity}</td>

                      {/* Price */}
                      <td className="py-4 px-4 text-right font-mono text-zinc-700">
                        {formatCurrency(item.unitPrice)}
                      </td>

                      {/* Item Discount */}
                      <td className="py-4 px-4 text-right font-mono text-rose-600">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "—"}
                      </td>

                      {/* Total */}
                      <td className="py-4 pl-4 text-right font-bold font-mono text-zinc-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary calculations */}
            <div className="flex justify-end pt-4 border-t border-zinc-200">
              <div className="w-full max-w-xs space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">{formatCurrency(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount (Header)</span>
                    <span className="font-mono font-medium">-{formatCurrency(receipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-100">
                  <span className="uppercase">Grand Total</span>
                  <span className="font-mono">{formatCurrency(receipt.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes if present */}
            {receipt.notes && (
              <div className="mt-8 rounded-lg bg-zinc-50 border border-zinc-200/60 p-4 print:bg-transparent print:border-zinc-300">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">POS Admin Notes</h4>
                <p className="text-xs text-zinc-600 font-mono whitespace-pre-wrap leading-relaxed">
                  {receipt.notes}
                </p>
              </div>
            )}

            {/* Footer message */}
            <div className="mt-12 text-center text-xs text-zinc-400 border-t border-zinc-100 pt-6">
              <p className="italic font-medium">{receipt.shop.receiptFooter}</p>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* THERMAL 80MM RECEIPT LAYOUT                                               */
          /* ========================================================================= */
          <div className="w-[80mm] min-h-[140mm] bg-white text-black border border-zinc-300 rounded shadow-md p-6 font-mono text-[11px] leading-tight print:shadow-none print:border-none print:p-0 print:w-full">
            {/* Header info */}
            <div className="text-center space-y-1 pb-4 border-b border-dashed border-zinc-300">
              <div className="text-sm font-bold uppercase tracking-wide">{receipt.shop.name}</div>
              <div className="text-[10px] text-zinc-700 whitespace-pre-line leading-snug">
                {receipt.shop.address}
              </div>
              <div className="text-[10px] text-zinc-700">
                {receipt.shop.phone && <div>Tel: {receipt.shop.phone}</div>}
                {receipt.shop.whatsapp && <div>WhatsApp: {receipt.shop.whatsapp}</div>}
              </div>
            </div>

            {/* Bill Details */}
            <div className="py-3 border-b border-dashed border-zinc-300 space-y-1">
              <div className="flex justify-between">
                <span>Receipt No:</span>
                <span className="font-bold">{receipt.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{formatDate(receipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{receipt.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span>{receipt.paymentMethod}</span>
              </div>
              {receipt.customerName && (
                <div className="border-t border-zinc-100 mt-1.5 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-semibold">{receipt.customerName}</span>
                  </div>
                  {receipt.customerPhone && (
                    <div className="flex justify-between text-[10px]">
                      <span>Phone:</span>
                      <span>{receipt.customerPhone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Purchased Units */}
            <div className="py-3 border-b border-dashed border-zinc-300 space-y-2.5">
              <div className="font-bold border-b border-zinc-100 pb-1 flex justify-between">
                <span>Item Description</span>
                <span>Total</span>
              </div>

              {receipt.items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="font-bold">{item.productName}</div>
                  <div className="text-[10px] text-zinc-700 leading-normal pl-2">
                    {item.unitSku && <div>SKU: {item.unitSku}</div>}
                    {item.unitStorage || item.unitColor || item.unitCondition ? (
                      <div>
                        {[
                          item.unitStorage,
                          item.unitColor,
                          item.unitCondition ? `${item.unitCondition}${item.unitGrade ? ` (G:${item.unitGrade.replace("_", "+")})` : ""}` : "",
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-800 pl-2">
                    <span>
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                      {item.discount > 0 && ` (Less: -${formatCurrency(item.discount)})`}
                    </span>
                    <span className="font-bold">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Summary */}
            <div className="py-3 space-y-1.5 border-b border-dashed border-zinc-300">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 && (
                <div className="flex justify-between text-zinc-800">
                  <span>Header Discount:</span>
                  <span>-{formatCurrency(receipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs border-t border-zinc-200 pt-1.5">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(receipt.total)}</span>
              </div>
            </div>

            {/* POS Notes if any */}
            {receipt.notes && (
              <div className="py-3 border-b border-dashed border-zinc-300">
                <span className="font-bold block mb-1">Receipt Notes:</span>
                <p className="text-[10px] text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {receipt.notes}
                </p>
              </div>
            )}

            {/* Footer message */}
            <div className="pt-4 text-center space-y-1">
              <div className="italic font-bold">{receipt.shop.receiptFooter}</div>
              <div className="text-[9px] text-zinc-500">Thank you, please visit again!</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

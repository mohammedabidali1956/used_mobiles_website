"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeStatusAction, deleteUnitAction, restoreUnitAction } from "./actions";
import type { PhoneUnitStatus } from "@prisma/client";

interface InventoryActionsProps {
  id: string;
  currentStatus: PhoneUnitStatus;
  isDeleted: boolean;
  userRole: string;
}

export default function InventoryActions({
  id,
  currentStatus,
  isDeleted,
  userRole,
}: InventoryActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<PhoneUnitStatus | null>(null);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus || !reason.trim() || loading) return;
    setLoading(true);
    setError(null);

    const res = await changeStatusAction(id, targetStatus, reason.trim());
    if (res.success) {
      setTargetStatus(null);
      setReason("");
      router.refresh();
    } else {
      setError(res.error || "Failed to change status.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const res = await deleteUnitAction(id);
    if (res.success) {
      setConfirmDelete(false);
      router.push("/admin/inventory");
      router.refresh();
    } else {
      setError(res.error || "Failed to delete phone unit.");
      setConfirmDelete(false);
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const res = await restoreUnitAction(id);
    if (res.success) {
      setConfirmRestore(false);
      router.refresh();
    } else {
      setError(res.error || "Failed to restore phone unit.");
      setConfirmRestore(false);
    }
    setLoading(false);
  };

  const triggerStatusConfirm = (status: PhoneUnitStatus) => {
    setConfirmDelete(false);
    setConfirmRestore(false);
    setTargetStatus(status);
    setReason("");
    setError(null);
  };

  const handleCancelStatus = () => {
    setTargetStatus(null);
    setReason("");
  };

  // Guard: STAFF has view-only access, hide all mutation controls
  if (userRole === "STAFF") return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
        Inventory Actions
      </h3>

      {error && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Deleted unit actions */}
      {isDeleted ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            This unit is soft-deleted. To perform stock actions, restore it first.
          </p>
          {confirmRestore ? (
            <div className="flex gap-2">
              <button
                onClick={handleRestore}
                disabled={loading}
                className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                {loading ? "Restoring..." : "Yes, Restore Unit"}
              </button>
              <button
                onClick={() => setConfirmRestore(false)}
                disabled={loading}
                className="rounded bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRestore(true)}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-all"
            >
              Restore Phone Unit
            </button>
          )}
        </div>
      ) : (
        /* Active unit actions */
        <div className="space-y-4">
          {/* Status buttons */}
          {targetStatus === null ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                disabled={currentStatus === "AVAILABLE" || loading}
                onClick={() => triggerStatusConfirm("AVAILABLE")}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Mark Available
              </button>
              <button
                disabled={currentStatus === "RESERVED" || loading}
                onClick={() => triggerStatusConfirm("RESERVED")}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Mark Reserved
              </button>
              <button
                disabled={currentStatus === "SOLD" || loading}
                onClick={() => triggerStatusConfirm("SOLD")}
                className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Mark Sold
              </button>
            </div>
          ) : (
            /* Reason form */
            <form onSubmit={handleStatusChange} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
              <span className="block text-xs font-semibold text-zinc-300">
                Confirm transition to {targetStatus.replace("_", " ")}
              </span>
              <div>
                <label htmlFor="status-reason" className="sr-only">Reason for status change</label>
                <input
                  id="status-reason"
                  type="text"
                  required
                  placeholder="Enter reason for this update (e.g. Sales check, Repair start)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                  disabled={loading}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                >
                  {loading ? "Updating..." : "Confirm Update"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelStatus}
                  className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Soft delete triggers */}
          <div className="border-t border-zinc-800/80 pt-4">
            {confirmDelete ? (
              <div className="flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <span className="text-xs font-semibold text-red-400">
                  Are you absolutely sure you want to delete this phone unit?
                </span>
                <p className="text-[11px] text-zinc-500">
                  This will soft-delete the unit and remove it from lists.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                  >
                    {loading ? "Deleting..." : "Yes, Delete Unit"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={loading}
                    className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTargetStatus(null);
                  setConfirmDelete(true);
                }}
                className="w-full rounded-lg border border-red-500/20 bg-red-500/5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete Phone Unit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

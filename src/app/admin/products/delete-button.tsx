"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction, restoreProductAction } from "./actions";

interface DeleteButtonProps {
  id: string;
  isDeleted: boolean;
  canRestore: boolean; // ADMIN/SUPER_ADMIN check passed from server
  redirectOnAction?: boolean;
}

export default function DeleteButton({
  id,
  isDeleted,
  canRestore,
  redirectOnAction = false,
}: DeleteButtonProps) {
  const router = useRouter();
  const [confirmState, setConfirmState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const res = await deleteProductAction(id);
    if (res.success) {
      setConfirmState(false);
      if (redirectOnAction) {
        router.push("/admin/products");
      }
      router.refresh();
    } else {
      setError(res.error || "Failed to delete product.");
      setConfirmState(false);
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const res = await restoreProductAction(id);
    if (res.success) {
      setConfirmState(false);
      router.refresh();
    } else {
      setError(res.error || "Failed to restore product.");
      setConfirmState(false);
    }
    setLoading(false);
  };

  if (isDeleted) {
    if (!canRestore) return null; // Only Admins can restore

    return (
      <div className="relative inline-block text-left">
        {confirmState ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestore}
              disabled={loading}
              className="rounded bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              {loading ? "Restoring..." : "Yes, Restore"}
            </button>
            <button
              onClick={() => setConfirmState(false)}
              disabled={loading}
              className="rounded bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmState(true)}
            className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all"
          >
            Restore Product
          </button>
        )}

        {error && (
          <div className="absolute right-0 top-10 rounded bg-red-950 border border-red-500/20 p-2 text-xs text-red-400 shadow-lg z-50 whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      {confirmState ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
          <button
            onClick={() => setConfirmState(false)}
            disabled={loading}
            className="rounded bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmState(true)}
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
        >
          Delete Product
        </button>
      )}

      {error && (
        <div className="absolute right-0 top-10 rounded bg-red-950 border border-red-500/20 p-2 text-xs text-red-400 shadow-lg z-50 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}

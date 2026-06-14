"use client";

import { useState } from "react";
import { toggleVisibilityAction } from "./actions";

interface VisibilityToggleProps {
  id: string;
  initialListed: boolean;
  disabled?: boolean;
}

export default function VisibilityToggle({ id, initialListed, disabled = false }: VisibilityToggleProps) {
  const [isListed, setIsListed] = useState(initialListed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (loading || disabled) return;
    setLoading(true);
    setError(null);

    const nextState = !isListed;
    const res = await toggleVisibilityAction(id, nextState);

    if (res.success) {
      setIsListed(nextState);
    } else {
      setError(res.error || "Failed to update visibility.");
      // Auto-clear error toast after 3s
      setTimeout(() => setError(null), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-1 items-start">
      <button
        onClick={handleToggle}
        disabled={loading || disabled}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all ${
          isListed
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700/80"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isListed ? "Click to Unlist Product" : "Click to List Product"}
      >
        {loading ? (
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-current"></span>
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${isListed ? "bg-emerald-400" : "bg-zinc-500"}`}></span>
        )}
        {isListed ? "Listed" : "Unlisted"}
      </button>

      {error && (
        <span className="absolute mt-7 rounded bg-red-950/80 border border-red-500/20 px-2 py-0.5 text-[10px] text-red-400 shadow-md backdrop-blur-sm z-50">
          {error}
        </span>
      )}
    </div>
  );
}

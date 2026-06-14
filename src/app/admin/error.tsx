"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error("[ADMIN_CONSOLE_ERROR]", error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-950 p-6 text-zinc-100 text-center">
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 max-w-md w-full space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">Admin Console Error</h1>
        <p className="text-sm text-zinc-400">
          An unexpected error occurred while loading this admin panel view. The error has been logged.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Retry Section
          </button>
          <a
            href="/admin"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

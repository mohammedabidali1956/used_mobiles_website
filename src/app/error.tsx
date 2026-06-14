"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error("[CRITICAL_CLIENT_ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/5 blur-3xl" />
      <span className="text-sm font-bold uppercase tracking-widest text-rose-500">Critical Failure</span>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-500">
        An unexpected error occurred in the application. Please try reloading the page or contacting support.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          Go Back Home
        </a>
      </div>
    </div>
  );
}

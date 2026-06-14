export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer rotating ring */}
        <div className="absolute h-full w-full rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
        {/* Inner pulse */}
        <div className="h-6 w-6 rounded-full bg-indigo-500/30 animate-pulse" />
      </div>
      <span className="mt-4 text-xs font-semibold uppercase tracking-widest text-zinc-500 animate-pulse">
        Loading…
      </span>
    </div>
  );
}

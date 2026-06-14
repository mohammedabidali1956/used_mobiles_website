export default function AdminLoading() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 bg-zinc-950/40 min-h-[400px]">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute h-full w-full rounded-full border-3 border-indigo-500/10 border-t-indigo-500 animate-spin" />
      </div>
      <span className="mt-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
        Updating view…
      </span>
    </div>
  );
}

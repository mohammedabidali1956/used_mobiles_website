import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/5 blur-3xl" />
      <span className="text-sm font-bold uppercase tracking-widest text-indigo-500">404 Error</span>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-500">
        Sorry, we couldn’t find the page you’re looking for. It might have been moved or deleted.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
        >
          Go Back Home
        </Link>
        <Link
          href="/phones"
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          Browse Phones
        </Link>
      </div>
    </div>
  );
}

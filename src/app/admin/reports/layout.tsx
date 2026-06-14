import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsTabs from "./reports-tabs";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Guard: Authenticated session is required
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md">
        <h1 className="text-3xl font-bold tracking-tight text-white">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monitor store performance, track inventory status, and analyze product sales metrics.
        </p>
      </div>

      {/* Navigation tabs */}
      <ReportsTabs userRole={session.role} />

      {/* Children content */}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

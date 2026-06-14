import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminHeader from "./admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login");
  }

  // Enforce role authorization: only ADMIN or SUPER_ADMIN are permitted
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    if (session.role === "STAFF") {
      redirect("/billing");
    } else {
      redirect("/login");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <AdminHeader name={session.name} role={session.role} />
      <main className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col">{children}</div>
      </main>
    </div>
  );
}

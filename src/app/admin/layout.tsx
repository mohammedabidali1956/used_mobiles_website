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


  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 print:bg-white print:text-black print:min-h-0">
      <div className="print:hidden">
        <AdminHeader name={session.name} role={session.role} />
      </div>
      <main className="flex flex-1 flex-col px-6 py-8 print:p-0 print:m-0">
        <div className="mx-auto w-full max-w-7xl flex-1 flex flex-col print:max-w-none print:w-full">{children}</div>
      </main>
    </div>
  );
}

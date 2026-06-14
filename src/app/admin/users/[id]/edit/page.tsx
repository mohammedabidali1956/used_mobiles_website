import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserService } from "@/lib/services/user.service";
import EditUserForm from "./edit-user-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  if (session?.role === "SUPER_ADMIN") {
    try {
      const user = await UserService.getUserById(session, id);
      return { title: `Edit ${user.name} - MobileX Admin` };
    } catch {}
  }
  return { title: "Edit User - MobileX Admin" };
}

export default async function EditUserPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only SUPER_ADMIN may edit users
  if (session.role !== "SUPER_ADMIN") redirect("/admin/users");

  const { id } = await params;
  let user;
  try {
    user = await UserService.getUserById(session, id);
  } catch (error) {
    console.error("[EDIT_USER_PAGE_ERROR]", error);
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Users
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">User Not Found</h2>
          <p className="mt-1 text-sm">This user could not be found or you do not have permission to edit them.</p>
        </div>
      </div>
    );
  }

  const isSelf = session.sub === user.id;

  return <EditUserForm user={user} isSelf={isSelf} />;
}

import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserService } from "@/lib/services/user.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  if (session && (session.role === "SUPER_ADMIN" || session.role === "ADMIN")) {
    try {
      const user = await UserService.getUserById(session, id);
      return { title: `${user.name} - Users - MobileX Admin` };
    } catch {}
  }
  return { title: "User Details - MobileX Admin" };
}

export default async function UserDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STAFF") redirect("/admin");

  const { id } = await params;
  let user;
  try {
    user = await UserService.getUserById(session, id);
  } catch (error) {
    console.error("[USER_DETAIL_ERROR]", error);
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "ADMIN":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

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
          <p className="mt-1 text-sm">This user could not be found or you do not have access.</p>
        </div>
      </div>
    );
  }

  const isViewingSelf = session.sub === user.id;

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Users
      </Link>

      {/* Header Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xl font-bold text-zinc-200">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${getRoleBadge(user.role)}`}>
                {user.role.replace("_", " ")}
              </span>
              {isViewingSelf && (
                <span className="inline-flex rounded border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400">
                  You
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500 font-mono">{user.email}</p>
          </div>
        </div>
        {isSuperAdmin && (
          <Link
            href={`/admin/users/${user.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors self-start sm:self-auto"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit User
          </Link>
        )}
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
            Account Details
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 block">Full Name</span>
              <span className="text-zinc-200 mt-1 block font-semibold">{user.name}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Email Address</span>
              <span className="text-zinc-200 mt-1 block font-mono">{user.email}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Assigned Role</span>
              <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${getRoleBadge(user.role)}`}>
                {user.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Activity */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-900 pb-2">
            Status & Activity
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-zinc-500 block">Account Status</span>
              <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${user.isActive ? "text-emerald-400" : "text-rose-400"}`}>
                <span className={`h-2 w-2 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-rose-500"}`}></span>
                {user.isActive ? "Active" : "Inactive / Suspended"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Last Login</span>
              <span className="text-zinc-200 mt-1 block">
                {user.lastLoginAt
                  ? `${new Date(user.lastLoginAt).toLocaleDateString()} at ${new Date(user.lastLoginAt).toLocaleTimeString()}`
                  : <span className="text-zinc-500 italic">Never logged in</span>}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Account Created</span>
              <span className="text-zinc-200 mt-1 block">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Last Updated</span>
              <span className="text-zinc-200 mt-1 block">
                {new Date(user.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

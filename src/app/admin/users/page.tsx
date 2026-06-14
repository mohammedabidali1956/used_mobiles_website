import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserService } from "@/lib/services/user.service";

export const metadata: Metadata = {
  title: "User Management - MobileX Admin",
  description: "View and manage admin portal users.",
};

interface SearchParams {
  page?: string;
  role?: string;
  isActive?: string;
  q?: string;
}

export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // STAFF has no access
  if (session.role === "STAFF") redirect("/admin");

  const params = await searchParams;

  let result;
  try {
    result = await UserService.listUsers(session, {
      page: params.page || "1",
      pageSize: "20",
      role: (params.role as any) || undefined,
      isActive: params.isActive,
    });
  } catch (error) {
    console.error("[USERS_LIST_ERROR]", error);
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

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;
  const page = result?.page || 1;

  const buildPageUrl = (p: number) => {
    const next = new URLSearchParams(params as Record<string, string>);
    next.set("page", String(p));
    return `/admin/users?${next.toString()}`;
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">User Management</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isSuperAdmin ? "Create and manage portal accounts." : "View portal user accounts."}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            id="btn-new-user"
            href="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New User
          </Link>
        )}
      </div>

      {/* Filters */}
      <form
        method="GET"
        action="/admin/users"
        className="flex flex-wrap gap-3 border border-zinc-800 bg-zinc-950 p-4 rounded-xl items-end"
      >
        <div className="flex-1 min-w-[160px] space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Search</label>
          <input
            type="text"
            name="q"
            defaultValue={params.q || ""}
            placeholder="Name or email…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="min-w-[130px] space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Role</label>
          <select
            name="role"
            defaultValue={params.role || ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>
        <div className="min-w-[130px] space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</label>
          <select
            name="isActive"
            defaultValue={params.isActive || ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          Apply
        </button>
        <Link
          href="/admin/users"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          Reset
        </Link>
      </form>

      {/* Table */}
      {!result ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
          <h2 className="text-lg font-bold">Failed to Load Users</h2>
          <p className="mt-1 text-sm">An unexpected error occurred while fetching the user list.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="overflow-x-auto">
            {result.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <svg className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="mt-4 text-sm font-bold text-zinc-300">No Users Found</h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                  No users match the current search or filter criteria.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Login</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {result.items.map((user) => (
                    <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-300">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-100">{user.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${getRoleBadge(user.role)}`}>
                          {user.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${user.isActive ? "text-emerald-400" : "text-zinc-500"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-zinc-600"}`}></span>
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : <span className="text-zinc-600 italic">Never</span>}
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View
                        </Link>
                        {isSuperAdmin && (
                          <Link
                            href={`/admin/users/${user.id}/edit`}
                            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                          >
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {result && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800 pt-5 sm:flex-row text-xs">
          <div className="text-zinc-500">
            Page <span className="font-semibold text-zinc-300">{page}</span> of{" "}
            <span className="font-semibold text-zinc-300">{totalPages}</span> ({result.total} users)
          </div>
          <div className="flex gap-2">
            <Link
              href={buildPageUrl(page - 1)}
              className={`rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={buildPageUrl(page + 1)}
              className={`rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

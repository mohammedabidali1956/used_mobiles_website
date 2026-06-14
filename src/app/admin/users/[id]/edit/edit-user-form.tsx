"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateUserAction,
  updateUserRoleAction,
  updateUserStatusAction,
  resetUserPasswordAction,
} from "../../actions";
import type { SafeUser } from "@/lib/services/user.service";

const ROLES = [
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

interface Props {
  user: SafeUser;
  isSelf: boolean;
}

export default function EditUserForm({ user, isSelf }: Props) {
  const router = useRouter();

  // --- Profile section ---
  const [profilePending, startProfileTransition] = useTransition();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // --- Role section ---
  const [rolePending, startRoleTransition] = useTransition();
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);

  // --- Status section ---
  const [statusPending, startStatusTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState(false);

  // --- Password section ---
  const [pwdPending, startPwdTransition] = useTransition();
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  // --- Handlers ---

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
    };
    startProfileTransition(async () => {
      const result = await updateUserAction(user.id, data);
      if (result.success) {
        setProfileSuccess(true);
        router.refresh();
      } else {
        setProfileError(result.error);
      }
    });
  };

  const handleRoleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRoleError(null);
    setRoleSuccess(false);
    startRoleTransition(async () => {
      const result = await updateUserRoleAction(user.id, selectedRole);
      if (result.success) {
        setRoleSuccess(true);
        router.refresh();
      } else {
        setRoleError(result.error);
      }
    });
  };

  const handleStatusToggle = async (newStatus: boolean) => {
    setStatusError(null);
    setStatusSuccess(false);
    startStatusTransition(async () => {
      const result = await updateUserStatusAction(user.id, newStatus);
      if (result.success) {
        setStatusSuccess(true);
        router.refresh();
      } else {
        setStatusError(result.error);
      }
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);
    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError("Password must be at least 8 characters.");
      return;
    }
    startPwdTransition(async () => {
      const result = await resetUserPasswordAction(user.id, newPwd);
      if (result.success) {
        setPwdSuccess(true);
        setNewPwd("");
        setConfirmPwd("");
      } else {
        setPwdError(result.error);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/admin/users/${user.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to User Details
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg font-bold text-zinc-200">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit User</h1>
            <p className="text-xs text-zinc-500 font-mono">{user.email}</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Profile Section                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-sm font-bold text-white">Profile Information</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Update the user's name and email address.</p>
        </div>

        {profileSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
            Profile updated successfully.
          </div>
        )}
        {profileError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-zinc-300">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={user.name}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-zinc-300">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={profilePending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-60"
            >
              {profilePending ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Role Section                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-sm font-bold text-white">Role & Permissions</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Change the user's system role. This affects what they can access.
            {isSelf && (
              <span className="ml-1 text-amber-400 font-semibold">You cannot change your own role.</span>
            )}
          </p>
        </div>

        {roleSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
            Role updated successfully.
          </div>
        )}
        {roleError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {roleError}
          </div>
        )}

        <form onSubmit={handleRoleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 min-w-[200px]">
            <label htmlFor="role-select" className="text-xs font-semibold text-zinc-300">System Role</label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isSelf}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={rolePending || isSelf || selectedRole === user.role}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-60"
          >
            {rolePending ? "Saving…" : "Update Role"}
          </button>
        </form>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Account Status                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-sm font-bold text-white">Account Status</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Activate or deactivate this account.
            {isSelf && (
              <span className="ml-1 text-amber-400 font-semibold">You cannot deactivate your own account.</span>
            )}
          </p>
        </div>

        {statusSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
            Status updated successfully.
          </div>
        )}
        {statusError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {statusError}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-sm font-semibold ${user.isActive ? "text-emerald-400" : "text-zinc-500"}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-zinc-600"}`}></span>
            Currently {user.isActive ? "Active" : "Inactive"}
          </div>
          {user.isActive ? (
            <button
              onClick={() => handleStatusToggle(false)}
              disabled={statusPending || isSelf}
              className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-60"
            >
              {statusPending ? "Updating…" : "Deactivate Account"}
            </button>
          ) : (
            <button
              onClick={() => handleStatusToggle(true)}
              disabled={statusPending}
              className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
            >
              {statusPending ? "Updating…" : "Activate Account"}
            </button>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Reset Password                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
        <div className="border-b border-zinc-900 pb-3">
          <h2 className="text-sm font-bold text-white">Reset Password</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Set a new password for this account.</p>
        </div>

        {pwdSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
            Password has been reset successfully.
          </div>
        )}
        {pwdError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            {pwdError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="text-xs font-semibold text-zinc-300">New Password</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="text-xs font-semibold text-zinc-300">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Re-enter password"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pwdPending || !newPwd}
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-60"
            >
              {pwdPending ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

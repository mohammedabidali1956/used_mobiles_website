"use client";

import { useState, useTransition } from "react";
import { saveSettingsGroupAction } from "./actions";
import type { SettingsGroup } from "@/lib/services/settings.service";

export interface FieldDef {
  key: string;
  label: string;
  description?: string;
  type: "text" | "email" | "textarea" | "select" | "toggle" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  group: SettingsGroup;
  fields: FieldDef[];
  values: Record<string, string>;
  isSuperAdmin: boolean;
}

export default function SettingsForm({ group, fields, values, isSuperAdmin }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Local draft state
  const [draft, setDraft] = useState<Record<string, string>>({ ...values });

  const set = (key: string, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveSettingsGroupAction(group, draft);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50";
  const labelClass = "text-xs font-semibold text-zinc-300 block";
  const descClass = "text-[11px] text-zinc-500 mt-0.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400">
          ✓ Settings saved successfully.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {fields.map((field) => {
        const val = draft[field.key] ?? "";
        return (
          <div key={field.key} className="space-y-1.5">
            <label htmlFor={field.key} className={labelClass}>
              {field.label}
            </label>
            {field.description && (
              <p className={descClass}>{field.description}</p>
            )}

            {field.type === "textarea" ? (
              <textarea
                id={field.key}
                rows={3}
                disabled={!isSuperAdmin}
                value={val}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`${inputClass} resize-none`}
              />
            ) : field.type === "select" ? (
              <select
                id={field.key}
                disabled={!isSuperAdmin}
                value={val}
                onChange={(e) => set(field.key, e.target.value)}
                className={inputClass}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "toggle" ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id={field.key}
                  disabled={!isSuperAdmin}
                  onClick={() => set(field.key, val === "true" ? "false" : "true")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    val === "true" ? "bg-indigo-600" : "bg-zinc-700"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      val === "true" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-300 font-medium">
                  {val === "true" ? "Enabled" : "Disabled"}
                </span>
              </div>
            ) : field.type === "number" ? (
              <input
                id={field.key}
                type="number"
                min="0"
                disabled={!isSuperAdmin}
                value={val}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
              />
            ) : (
              <input
                id={field.key}
                type={field.type}
                disabled={!isSuperAdmin}
                value={val}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
              />
            )}
          </div>
        );
      })}

      {isSuperAdmin && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save Settings"}
          </button>
        </div>
      )}

      {!isSuperAdmin && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
          You have read-only access. Contact a Super Admin to make changes.
        </div>
      )}
    </form>
  );
}

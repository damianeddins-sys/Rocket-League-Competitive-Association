"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignableRoleCodes } from "@/services/user-management";

type ManagedUser = {
  id: string;
  displayName: string;
  email: string;
  assignments: Array<{
    id: string;
    role: string;
    seasonId: string | null;
    teamId: string | null;
    expiresAt: string | null;
  }>;
};

export function UserPermissionManager({ users }: { users: ManagedUser[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  async function grant(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    if (typeof payload.expiresAt === "string" && payload.expiresAt) {
      payload.expiresAt = new Date(payload.expiresAt).toISOString();
    }
    const response = await fetch("/api/admin/role-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Database assignment granted and audited." : result.error ?? "Assignment failed");
    if (response.ok) router.refresh();
  }

  async function revoke(formData: FormData) {
    const response = await fetch("/api/admin/role-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Assignment revoked and audited." : result.error ?? "Revocation failed");
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-7 space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Database assignments provide league scope. Staff portal authorization still requires the matching verified Discord role, preventing a database-only privilege escalation.
      </div>
      {message && <p className="rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-900" role="status">{message}</p>}
      {users.map((user) => (
        <article key={user.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-black text-[#081e3a]">{user.displayName}</h3>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.assignments.map((assignment) => (
              <form key={assignment.id} action={revoke} className="flex items-center gap-2 rounded-lg bg-slate-100 p-2">
                <span className="px-2 text-xs font-bold">{assignment.role.replaceAll("_", " ")}</span>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <input name="reason" required minLength={3} maxLength={1000} aria-label={`Reason to revoke ${assignment.role}`} placeholder="Revocation reason" className="w-36 rounded border border-slate-300 px-2 py-1 text-xs" />
                <button className="rounded bg-red-50 px-2 py-1 text-xs font-black text-red-700">Revoke</button>
              </form>
            ))}
            {user.assignments.length === 0 && <span className="text-sm text-slate-400">No active database assignments.</span>}
          </div>
          <form action={grant} className="mt-4 grid gap-3 sm:grid-cols-[1fr_13rem_auto]">
            <input type="hidden" name="userId" value={user.id} />
            <select name="role" required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              {assignableRoleCodes.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
            </select>
            <input name="expiresAt" type="datetime-local" aria-label="Optional assignment expiration" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Grant assignment</button>
          </form>
        </article>
      ))}
      {users.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No users are available.</p>}
    </div>
  );
}

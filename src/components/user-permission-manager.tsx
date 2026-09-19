"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignableRoleCodes } from "@/services/role-assignments";
import { readApiResult } from "@/services/api-response";
import {
  databaseRoleCodes,
  databaseRoleEntitlements,
  type DatabaseRoleCode,
} from "@/services/auth/database-roles";

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

export function UserPermissionManager({
  users,
  teams,
  seasons,
}: {
  users: ManagedUser[];
  teams: Array<{ id: string; name: string }>;
  seasons: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  async function addMember(formData: FormData) {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await readApiResult<{ existing?: boolean }>(response);
    setMessage(response.ok
      ? result.existing ? "Discord member already exists in the RLCA database." : "Discord member added. Assign the database role below."
      : result.error ?? "Staff member could not be added");
    if (response.ok) router.refresh();
  }

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
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Database assignment granted and audited." : result.error ?? "Assignment failed");
    if (response.ok) router.refresh();
  }

  async function revoke(formData: FormData) {
    const response = await fetch("/api/admin/role-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Assignment revoked and audited." : result.error ?? "Revocation failed");
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-7 space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Database assignments provide league scope. Staff portal authorization also requires the matching live Discord role, preventing a database-only privilege escalation. Revoking this assignment removes website access on the next request.
      </div>
      {message && <p className="rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-900" role="status">{message}</p>}
      <form action={addMember} className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-5 sm:grid-cols-[1fr_auto]">
        <div className="sm:col-span-2">
          <h3 className="font-black text-blue-950">Add Discord member</h3>
          <p className="mt-1 text-sm text-blue-900">The member must already be in the RLCA Discord server. No token or secret is exposed to this form.</p>
        </div>
        <input name="discordUserId" required pattern="\d{16,22}" placeholder="Discord user ID" className="rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm" />
        <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Add member</button>
      </form>
      {users.map((user) => (
        <article key={user.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-black text-[#081e3a]">{user.displayName}</h3>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.assignments.map((assignment) => (
              <form key={assignment.id} action={revoke} className="flex items-center gap-2 rounded-lg bg-slate-100 p-2">
                <span className="px-2 text-xs font-bold" title={
                  databaseRoleCodes.includes(assignment.role as DatabaseRoleCode)
                    ? databaseRoleEntitlements(assignment.role as DatabaseRoleCode).permissions.join(", ")
                    : undefined
                }>{assignment.role.replaceAll("_", " ")}</span>
                {databaseRoleCodes.includes(assignment.role as DatabaseRoleCode) && (
                  <details className="max-w-xs text-[10px] text-slate-500">
                    <summary className="cursor-pointer font-bold">Permissions</summary>
                    {databaseRoleEntitlements(assignment.role as DatabaseRoleCode).permissions.join(", ") || "Portal view only"}
                  </details>
                )}
                {assignment.teamId && <span className="text-[10px] text-slate-500">{teams.find((team) => team.id === assignment.teamId)?.name ?? "Unknown franchise"}</span>}
                {assignment.seasonId && <span className="text-[10px] text-slate-500">{seasons.find((season) => season.id === assignment.seasonId)?.name ?? "Unknown season"}</span>}
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <input name="reason" required minLength={3} maxLength={1000} aria-label={`Reason to revoke ${assignment.role}`} placeholder="Revocation reason" className="w-36 rounded border border-slate-300 px-2 py-1 text-xs" />
                <button className="rounded bg-red-50 px-2 py-1 text-xs font-black text-red-700">Revoke</button>
              </form>
            ))}
            {user.assignments.length === 0 && <span className="text-sm text-slate-400">No active database assignments.</span>}
          </div>
          <form action={grant} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="userId" value={user.id} />
            <select name="role" required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              {assignableRoleCodes.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
            </select>
            <select name="teamId" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" aria-label="Optional franchise scope">
              <option value="">All/no franchise scope</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
            <select name="seasonId" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" aria-label="Optional season scope">
              <option value="">All seasons</option>
              {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
            </select>
            <input name="expiresAt" type="datetime-local" aria-label="Optional assignment expiration" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white sm:col-span-2">Grant assignment</button>
          </form>
        </article>
      ))}
      {users.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No users are available.</p>}
    </div>
  );
}

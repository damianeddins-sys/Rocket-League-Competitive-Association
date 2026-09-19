"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function Feedback({ message }: { message?: string }) {
  return message
    ? <p className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900" role="status">{message}</p>
    : null;
}

export function BotControl() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function register() {
    setMessage("Registering commands with Discord…");
    const response = await fetch("/api/admin/discord/register", { method: "POST" });
    const result = await response.json() as { error?: string; registered?: number };
    setMessage(response.ok ? `${result.registered} commands registered. Refreshing health…` : result.error ?? "Command registration failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5">
      <h3 className="font-black text-blue-950">Serverless bot control</h3>
      <p className="mt-2 text-sm leading-6 text-blue-900">Discord sends signed commands directly to this deployment, so no fragile Gateway connection is required. The bot remains available whenever the website deployment is online.</p>
      {message && <p className="mt-3 text-sm font-bold text-blue-950" role="status">{message}</p>}
      <button onClick={register} className="mt-4 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Register or repair Discord commands</button>
    </div>
  );
}

export function OperationsOverview({
  counts,
}: {
  counts: Record<"applications" | "transactions" | "players" | "franchises" | "members", number>;
}) {
  const links = {
    applications: "/operations/applications",
    transactions: "/operations/transactions",
    players: "/operations/players",
    franchises: "/operations/teams",
    members: "/operations/staff",
  };
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Object.entries(counts).map(([label, value]) => (
        <Link key={label} href={links[label as keyof typeof links]} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300">
          <p className="text-3xl font-black text-[#081e3a]">{value}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
        </Link>
      ))}
    </div>
  );
}

type TransactionRow = {
  id: string;
  type: string;
  status: string;
  teamName: string;
  submittedByName: string;
  createdAt: string;
  requestData: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
};

export function TransactionManager({ transactions }: { transactions: TransactionRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function decide(formData: FormData) {
    setMessage("Saving transaction decision…");
    const response = await fetch("/api/admin/operations/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Transaction decision saved and audited." : result.error ?? "Decision failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-7 space-y-4">
      <Feedback message={message} />
      {transactions.map((transaction) => (
        <article key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">{transaction.type.replaceAll("_", " ")}</p>
              <h3 className="mt-1 text-lg font-black text-[#081e3a]">{transaction.teamName}</h3>
              <p className="text-sm text-slate-500">Submitted by {transaction.submittedByName} · {new Date(transaction.createdAt).toLocaleString()}</p>
            </div>
            <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{transaction.status.replaceAll("_", " ")}</span>
          </div>
          <details className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
            <summary className="cursor-pointer font-bold">Request and roster comparison</summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({
              request: transaction.requestData,
              before: transaction.beforeState,
              proposed: transaction.proposedState,
            }, null, 2)}</pre>
          </details>
          <form action={decide} className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
            <input type="hidden" name="id" value={transaction.id} />
            <select name="status" defaultValue={transaction.status === "PENDING" ? "ON_HOLD" : transaction.status} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="MORE_INFO_REQUIRED">More information</option>
              <option value="ON_HOLD">On hold</option>
              <option value="EXCEPTION_REQUIRED">Exception required</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input name="reason" required minLength={3} maxLength={2000} placeholder="Required decision reason" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Save decision</button>
          </form>
        </article>
      ))}
      {!transactions.length && <Empty text="No transaction requests are stored yet." />}
    </div>
  );
}

type PlayerRow = {
  id: string;
  handle: string;
  avatarUrl: string | null;
  playerSeasonId: string | null;
  status: string | null;
  division: string | null;
  currentMmr: string | null;
  team: string | null;
};

const playerStatuses = [
  "APPLIED", "VERIFICATION_PENDING", "VERIFICATION_COMPLETE", "COMBINE_PENDING",
  "PLACEMENT_PENDING", "ACTIVE", "INACTIVE", "ROSTERED", "WAIVER", "FREE_AGENT",
  "RESTRICTED", "SUSPENDED", "ARCHIVED",
];

export function PlayerManager({ players }: { players: PlayerRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function save(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/operations/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        playerSeasonId: payload.playerSeasonId || null,
        status: payload.status || null,
      }),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Player profile and status saved." : result.error ?? "Player update failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-7 space-y-4">
      <Feedback message={message} />
      {players.map((player) => (
        <form key={player.id} action={save} className="rounded-xl border border-slate-200 bg-white p-5">
          <input type="hidden" name="id" value={player.id} />
          <input type="hidden" name="playerSeasonId" value={player.playerSeasonId ?? ""} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold">Handle<input name="handle" defaultValue={player.handle} required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-bold">Avatar URL<input name="avatarUrl" type="url" defaultValue={player.avatarUrl ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-bold">Season status
              <select name="status" disabled={!player.playerSeasonId} defaultValue={player.status ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal">
                {!player.status && <option value="">No season record</option>}
                {playerStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">Reason<input name="reason" required minLength={3} maxLength={2000} placeholder="Required audit reason" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          </div>
          <p className="mt-3 text-xs text-slate-500">{player.team ?? "No franchise"} · {player.division ?? "Unplaced"} · MMR {player.currentMmr ?? "—"}</p>
          <button className="mt-4 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Save player</button>
        </form>
      ))}
      {!players.length && <Empty text="No player records are stored yet. Approved Player applications will appear here." />}
    </div>
  );
}

type TeamRow = {
  id: string;
  franchiseNumber: number | null;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  discordFranchiseRoleId: string | null;
  active: boolean;
};

export function TeamManager({ teams }: { teams: TeamRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function save(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/operations/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, active: payload.active === "on" }),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Franchise settings saved and audited." : result.error ?? "Franchise update failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-7 space-y-4">
      <Feedback message={message} />
      {teams.map((team) => (
        <form key={team.id} action={save} className="rounded-xl border border-slate-200 bg-white p-5">
          <input type="hidden" name="id" value={team.id} />
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-lg" style={{ backgroundColor: team.primaryColor }} />
            <div><p className="text-xs font-black uppercase text-slate-400">Franchise {team.franchiseNumber}</p><h3 className="font-black text-[#081e3a]">{team.name}</h3></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-bold">Logo URL<input name="logoUrl" type="url" defaultValue={team.logoUrl ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-bold">Primary color<input name="primaryColor" type="color" defaultValue={team.primaryColor} className="mt-2 h-11 w-full rounded-lg border border-slate-300 p-1" /></label>
            <label className="text-sm font-bold">Discord franchise role ID<input name="discordFranchiseRoleId" required defaultValue={team.discordFranchiseRoleId ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono font-normal" /></label>
            <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={team.active} /> Active franchise</label>
            <input name="reason" required minLength={3} maxLength={2000} placeholder="Required audit reason" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm md:col-span-2" />
          </div>
          <button className="mt-4 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Save franchise</button>
        </form>
      ))}
      {!teams.length && <Empty text="No franchises are stored. Run the Season 1 seed." />}
    </div>
  );
}

type DocumentRow = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  recipientEmail: string;
  providerMessageId: string | null;
  sentAt: string;
  applicationName: string;
  sentByName: string;
};

export function DocumentManager({ documents }: { documents: DocumentRow[] }) {
  return (
    <div className="mt-7 space-y-3">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        New documents are sent from an application in the Applications tab. This ledger preserves every delivery for auditing.
      </div>
      {documents.map((document) => (
        <article key={document.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto]">
          <div>
            <h3 className="font-black text-[#081e3a]">{document.fileName}</h3>
            <p className="mt-1 text-sm text-slate-500">{document.applicationName} · sent by {document.sentByName}</p>
            <p className="mt-1 text-xs text-slate-400">To {document.recipientEmail} · {(document.sizeBytes / 1024).toFixed(1)} KB · {new Date(document.sentAt).toLocaleString()}</p>
          </div>
          <span className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{document.providerMessageId ? "DELIVERED TO PROVIDER" : "SENT"}</span>
        </article>
      ))}
      {!documents.length && <Empty text="No document deliveries have been recorded." />}
    </div>
  );
}

type SeasonRow = {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  active: boolean;
  startsAt: string;
  endsAt: string;
  settings: Record<string, unknown>;
};
type ChannelRow = { id: string; key: string; channelId: string; displayName: string; active: boolean };

export function SettingsManager({
  seasons,
  channels,
  roles,
}: {
  seasons: SeasonRow[];
  channels: ChannelRow[];
  roles: Array<{ id: string; key: string; roleId: string; displayName: string; active: boolean }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function patch(resource: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/admin/operations/${resource}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Configuration saved and audited." : result.error ?? "Configuration update failed");
    if (response.ok) router.refresh();
  }
  async function saveSeason(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    let settings: Record<string, unknown>;
    try { settings = JSON.parse(String(payload.settings)); } catch { setMessage("Season settings must be valid JSON."); return; }
    await patch("seasons", {
      ...payload,
      startsAt: new Date(String(payload.startsAt)).toISOString(),
      endsAt: new Date(String(payload.endsAt)).toISOString(),
      active: payload.active === "on",
      settings,
    });
  }
  async function saveChannel(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    await patch("channels", { ...payload, active: payload.active === "on" });
  }
  return (
    <div className="mt-7 space-y-7">
      <Feedback message={message} />
      <section>
        <h3 className="text-lg font-black text-[#081e3a]">Season configuration</h3>
        <div className="mt-3 space-y-3">
          {seasons.map((season) => (
            <form key={season.id} action={saveSeason} className="rounded-xl border border-slate-200 bg-white p-5">
              <input type="hidden" name="id" value={season.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <input name="name" required defaultValue={season.name} className="rounded-lg border border-slate-300 px-3 py-2.5" aria-label="Season name" />
                <select name="status" defaultValue={season.status} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5" aria-label="Season status"><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select>
                <input name="startsAt" type="datetime-local" required defaultValue={season.startsAt.slice(0, 16)} className="rounded-lg border border-slate-300 px-3 py-2.5" aria-label="Season starts" />
                <input name="endsAt" type="datetime-local" required defaultValue={season.endsAt.slice(0, 16)} className="rounded-lg border border-slate-300 px-3 py-2.5" aria-label="Season ends" />
                <textarea name="settings" rows={5} defaultValue={JSON.stringify(season.settings, null, 2)} className="rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-xs md:col-span-2" aria-label="Season settings JSON" />
                <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={season.active} /> Current active season</label>
                <input name="reason" required minLength={3} placeholder="Required audit reason" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              </div>
              <button className="mt-4 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Save season</button>
            </form>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-black text-[#081e3a]">Discord channels</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {channels.map((channel) => (
            <form key={channel.id} action={saveChannel} className="rounded-xl border border-slate-200 bg-white p-4">
              <input type="hidden" name="id" value={channel.id} />
              <p className="mb-3 font-mono text-xs font-bold text-slate-400">{channel.key}</p>
              <input name="displayName" required defaultValue={channel.displayName} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Channel display name" />
              <input name="channelId" required defaultValue={channel.channelId} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" aria-label="Discord channel ID" />
              <input name="reason" required minLength={3} placeholder="Audit reason" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={channel.active} /> Active</label>
              <button className="mt-3 rounded-lg bg-[#1683ff] px-3 py-2 text-xs font-black text-white">Save channel</button>
            </form>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-black text-[#081e3a]">Verified Discord role mappings</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{roles.map((role) => <div key={role.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm"><strong>{role.displayName}</strong><p className="font-mono text-xs text-slate-500">{role.key} · {role.roleId}</p></div>)}</div>
      </section>
    </div>
  );
}

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  actorName: string;
  createdAt: string;
};

export function AuditManager({ logs }: { logs: AuditRow[] }) {
  return (
    <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Reason</th></tr></thead>
        <tbody>{logs.map((log) => <tr key={log.id} className="border-t border-slate-100"><td className="p-4">{new Date(log.createdAt).toLocaleString()}</td><td>{log.actorName}</td><td className="font-bold">{log.action.replaceAll("_", " ")}</td><td className="font-mono text-xs">{log.entityType}:{log.entityId.slice(0, 8)}</td><td>{log.reason ?? "—"}</td></tr>)}</tbody>
      </table>
      {!logs.length && <Empty text="No audit events have been stored." />}
    </div>
  );
}

export function FranchiseWorkspace({
  data,
}: {
  data: {
    team: { name: string; primaryColor: string } | null;
    roster: Array<{ id: string; handle: string; startsAt: string }>;
    transactions: Array<{ id: string; type: string; status: string; createdAt: string }>;
  };
}) {
  if (!data.team) return <div className="mt-7"><Empty text="Your verified Discord account is not assigned to exactly one franchise." /></div>;
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-2 rounded-full" style={{ backgroundColor: data.team.primaryColor }} />
        <h3 className="mt-4 text-xl font-black text-[#081e3a]">{data.team.name} roster</h3>
        <div className="mt-4 space-y-2">{data.roster.map((member) => <div key={member.id} className="rounded-lg bg-slate-50 p-3 text-sm font-bold">{member.handle}</div>)}</div>
        {!data.roster.length && <p className="mt-4 text-sm text-slate-500">No active roster memberships.</p>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-black text-[#081e3a]">Transaction requests</h3>
        <div className="mt-4 space-y-2">{data.transactions.map((transaction) => <div key={transaction.id} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><strong>{transaction.type.replaceAll("_", " ")}</strong><span>{transaction.status.replaceAll("_", " ")}</span></div>)}</div>
        {!data.transactions.length && <p className="mt-4 text-sm text-slate-500">No franchise transaction requests.</p>}
      </section>
    </div>
  );
}

export function StatisticsWorkspace({
  replays,
}: {
  replays: Array<{ id: string; status: string; player: string; submittedAt: string; parserVersion: string | null }>;
}) {
  return (
    <div className="mt-7 space-y-3">
      {replays.map((replay) => <div key={replay.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"><div><strong>{replay.player}</strong><p className="text-xs text-slate-500">{new Date(replay.submittedAt).toLocaleString()} · Parser {replay.parserVersion ?? "pending"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{replay.status.replaceAll("_", " ")}</span></div>)}
      {!replays.length && <Empty text="No replay submissions are stored." />}
    </div>
  );
}

export function ProductionWorkspace({
  data,
}: {
  data: {
    events: Array<{ id: string; name: string; startsAt: string; endsAt: string }>;
    matches: Array<{ id: string; status: string; scheduledAt: string; teamA: string; teamB: string }>;
  };
}) {
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Events</h3><div className="mt-3 space-y-2">{data.events.map((event) => <div key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{event.name}</strong><p className="text-xs text-slate-500">{new Date(event.startsAt).toLocaleDateString()}–{new Date(event.endsAt).toLocaleDateString()}</p></div>)}</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Match production queue</h3><div className="mt-3 space-y-2">{data.matches.map((match) => <div key={match.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{match.teamA} vs {match.teamB}</strong><p className="text-xs text-slate-500">{new Date(match.scheduledAt).toLocaleString()} · {match.status}</p></div>)}</div></section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{text}</p>;
}

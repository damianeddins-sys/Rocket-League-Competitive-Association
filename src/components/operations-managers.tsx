"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TierBadge, TierNavigation } from "@/components/tier-navigation";
import { readApiResult } from "@/services/api-response";
import type { TierId } from "@/services/tiers";

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
    const result = await readApiResult<{ registered?: number }>(response);
    setMessage(response.ok ? `${result.registered} commands registered. Refreshing health…` : result.error ?? "Command registration failed");
    if (response.ok) router.refresh();
  }
  async function retryNotifications() {
    setMessage("Re-queuing failed Discord notifications…");
    const response = await fetch("/api/admin/discord/notifications/retry", { method: "POST" });
    const result = await readApiResult<{ retried?: number }>(response);
    setMessage(response.ok ? `${result.retried ?? 0} failed notifications re-queued.` : result.error ?? "Notification retry failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-5">
      <h3 className="font-black text-blue-950">Discord command control</h3>
      <p className="mt-2 text-sm leading-6 text-blue-900">Signed slash commands are handled by the website. Online presence, reconnect monitoring, and queued notifications are handled by the persistent Gateway worker.</p>
      {message && <p className="mt-3 text-sm font-bold text-blue-950" role="status">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={register} className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Register or repair Discord commands</button>
        <button onClick={retryNotifications} className="rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-black text-blue-900">Retry failed notifications</button>
      </div>
    </div>
  );
}

export function OperationsOverview({
  counts,
}: {
  counts: Record<"applications" | "transactions" | "players" | "franchises" | "members", number> & {
    tiers: Array<{
      id: TierId;
      name: string;
      color: string;
      teams: number;
      matches: number;
      completed: number;
    }>;
  };
}) {
  const links = {
    applications: "/operations/applications",
    transactions: "/operations/transactions",
    players: "/operations/players",
    franchises: "/operations/teams",
    members: "/operations/staff",
  };
  const summary = {
    applications: counts.applications,
    transactions: counts.transactions,
    players: counts.players,
    franchises: counts.franchises,
    members: counts.members,
  };
  return (
    <div className="mt-7">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Object.entries(summary).map(([label, value]) => (
        <Link key={label} href={links[label as keyof typeof links]} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300">
          <p className="text-3xl font-black text-[#081e3a]">{value}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
        </Link>
      ))}
    </div>
    <section className="mt-7">
      <h3 className="text-lg font-black text-[#081e3a]">Active season by tier</h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {counts.tiers.map((tier) => (
          <article key={tier.id} className="rounded-xl border bg-white p-5" style={{ borderTop: `4px solid ${tier.color}` }}>
            <TierBadge tierId={tier.id} compact />
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div><dt className="text-[10px] font-bold uppercase text-slate-400">Teams</dt><dd className="mt-1 text-xl font-black">{tier.teams}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-400">Matches</dt><dd className="mt-1 text-xl font-black">{tier.matches}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase text-slate-400">Complete</dt><dd className="mt-1 text-xl font-black">{tier.completed}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
    </div>
  );
}

type TransactionRow = {
  id: string;
  type: string;
  status: string;
  teamName: string;
  submittedByName: string;
  tier: { name: string; slug: string };
  createdAt: string;
  requestData: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  proposedState: Record<string, unknown>;
};

export function TransactionManager({
  transactions,
  page,
  pages,
  total,
}: {
  transactions: TransactionRow[];
  page: number;
  pages: number;
  total: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function decide(formData: FormData) {
    setMessage("Saving transaction decision…");
    const response = await fetch("/api/admin/operations/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await readApiResult<object>(response);
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
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-600">{transaction.tier.name} tier</p>
              <p className="text-sm text-slate-500">Submitted by {transaction.submittedByName} · {new Date(transaction.createdAt).toLocaleString()}</p>
              <p className="mt-1 font-mono text-xs text-slate-400">Transaction {transaction.id}</p>
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
          {!["APPROVED", "DENIED", "EXPIRED", "CANCELLED"].includes(transaction.status) && (
            <form action={decide} className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
              <input type="hidden" name="id" value={transaction.id} />
              <select name="status" defaultValue={transaction.status === "PENDING" ? "ON_HOLD" : transaction.status} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                <option value="MORE_INFO_REQUIRED">More information</option>
                <option value="ON_HOLD">On hold</option>
                <option value="EXCEPTION_REQUIRED">Exception required</option>
                <option value="APPROVED">Approve and apply roster</option>
                <option value="DENIED">Denied</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input name="reason" required minLength={3} maxLength={2000} placeholder="Required decision reason" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Save decision</button>
            </form>
          )}
        </article>
      ))}
      {!transactions.length && <Empty text="No transaction requests are stored yet." />}
      {pages > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 text-sm">
          <span>{total} transactions · Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/operations/transactions?page=${page - 1}`} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-bold">Previous</Link>}
            {page < pages && <Link href={`/operations/transactions?page=${page + 1}`} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-bold">Next</Link>}
          </div>
        </div>
      )}
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
    const result = await readApiResult<object>(response);
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
    const result = await readApiResult<object>(response);
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
  subject: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  recipientEmail: string;
  providerMessageId: string | null;
  sentAt: string;
  applicationName: string;
  sentByName: string;
};

export function DocumentManager({
  documents,
  applications,
}: {
  documents: DocumentRow[];
  applications: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function send(formData: FormData) {
    setMessage("Sending document through the configured email provider…");
    const response = await fetch("/api/applications/send-document", {
      method: "POST",
      body: formData,
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Document sent and recorded in the delivery ledger." : result.error ?? "Document delivery failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-7 space-y-3">
      <Feedback message={message} />
      <form action={send} className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <h3 className="font-black text-blue-950">Send signup document</h3>
        <p className="mt-1 text-sm text-blue-900">Delivery occurs only after Resend confirms the request. Every successful delivery is stored below.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select name="applicationId" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="">General signup document</option>
            {applications.map((application) => <option key={application.id} value={application.id}>{application.name}</option>)}
          </select>
          <input name="subject" required minLength={3} maxLength={160} placeholder="Email subject" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <textarea name="message" required minLength={3} maxLength={5000} rows={3} placeholder="Email message" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm md:col-span-2" />
          <input name="document" type="file" required accept=".pdf,.docx,image/png,image/jpeg" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" />
          <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Send document</button>
        </div>
      </form>
      {documents.map((document) => (
        <article key={document.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_auto]">
          <div>
            <h3 className="font-black text-[#081e3a]">{document.subject}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">{document.fileName}</p>
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
type ChannelRow = {
  id: string;
  key: string;
  channelId: string;
  displayName: string;
  category: string;
  active: boolean;
};

export function SettingsManager({
  seasons,
  channels,
  roles,
  notificationRoutes,
  integration,
  owner,
  tiers,
  teamTierAssignments,
}: {
  seasons: SeasonRow[];
  channels: ChannelRow[];
  roles: Array<{ id: string; key: string; roleId: string; displayName: string; active: boolean }>;
  notificationRoutes: Array<{
    eventType: string;
    tierId: string;
    channelKey: string;
    enabled: boolean;
  }>;
  integration: {
    runtime: {
      status: string;
      targetGuildConnected: boolean;
      lastHeartbeatAt: string | null;
      lastDisconnectAt: string | null;
      lastError: string | null;
    } | null;
    queued: number;
    failed: number;
  };
  owner: boolean;
  tiers: Array<{
    id: string;
    seasonId: string;
    slug: string;
    displayName: string;
    color: string;
    iconPath: string;
    active: boolean;
  }>;
  teamTierAssignments: Array<{
    teamId: string;
    teamName: string;
    seasonId: string;
    seasonName: string;
    tierId: string;
    tierName: string;
    active: boolean;
  }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function patch(resource: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/admin/operations/${resource}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readApiResult<object>(response);
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
  async function createChannel(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/operations/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, active: payload.active === "on" }),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Discord channel mapping created and audited." : result.error ?? "Channel creation failed");
    if (response.ok) router.refresh();
  }
  async function saveNotificationRoute(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    await patch("notification-routes", {
      ...payload,
      enabled: payload.enabled === "on",
    });
  }
  async function saveTier(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    await patch("tiers", { ...payload, active: payload.active === "on" });
  }
  async function saveTeamTier(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    await patch("team-tiers", { ...payload, active: payload.active === "on" });
  }
  return (
    <div className="mt-7 space-y-7">
      <Feedback message={message} />
      <section>
        <h3 className="text-lg font-black text-[#081e3a]">Discord integration status</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Gateway worker</p>
            <p className="mt-2 text-xl font-black text-[#081e3a]">{integration.runtime?.status ?? "NOT STARTED"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {integration.runtime?.lastHeartbeatAt
                ? `Last heartbeat ${new Date(integration.runtime.lastHeartbeatAt).toLocaleString()}`
                : "No worker heartbeat has been recorded."}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Target server</p>
            <p className={`mt-2 text-xl font-black ${integration.runtime?.targetGuildConnected ? "text-emerald-700" : "text-red-700"}`}>
              {integration.runtime?.targetGuildConnected ? "CONNECTED" : "NOT VERIFIED"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Notification queue</p>
            <p className="mt-2 text-xl font-black text-[#081e3a]">{integration.queued} queued · {integration.failed} failed</p>
          </div>
        </div>
        {integration.runtime?.lastError && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Latest worker report: {integration.runtime.lastError}
          </p>
        )}
      </section>
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
        <h3 className="text-lg font-black text-[#081e3a]">Season tier configuration</h3>
        <p className="mt-1 text-sm text-slate-600">Canonical IDs are fixed to challenger, contender, premier, and master. Presentation and activation remain auditable.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {tiers.map((tier) => (
            <form key={tier.id} action={saveTier} className="rounded-xl border bg-white p-4" style={{ borderTop: `4px solid ${tier.color}` }}>
              <input type="hidden" name="id" value={tier.id} />
              <p className="font-mono text-xs font-black uppercase text-slate-400">{tier.slug}</p>
              <input name="displayName" required defaultValue={tier.displayName} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Tier display name" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input name="color" required pattern="#[0-9a-fA-F]{6}" defaultValue={tier.color} className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" aria-label="Tier color" />
                <input name="iconPath" required defaultValue={tier.iconPath} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" aria-label="Tier icon path" />
              </div>
              <input name="reason" required minLength={3} placeholder="Required audit reason" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={tier.active} /> Active for season</label>
              <button className="mt-3 rounded-lg bg-[#1683ff] px-3 py-2 text-xs font-black text-white">Save tier</button>
            </form>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-black text-[#081e3a]">Franchise tier entries</h3>
        <p className="mt-1 text-sm text-slate-600">Each entry is season-specific. Deactivation preserves historical records.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {teamTierAssignments.map((assignment) => (
            <form key={`${assignment.seasonId}:${assignment.teamId}:${assignment.tierId}`} action={saveTeamTier} className="rounded-xl border border-slate-200 bg-white p-4">
              <input type="hidden" name="seasonId" value={assignment.seasonId} />
              <input type="hidden" name="teamId" value={assignment.teamId} />
              <input type="hidden" name="tierId" value={assignment.tierId} />
              <p className="font-black text-[#081e3a]">{assignment.teamName}</p>
              <p className="mt-1 text-xs font-bold uppercase text-slate-500">{assignment.seasonName} · {assignment.tierName}</p>
              <input name="reason" required minLength={3} placeholder="Required audit reason" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
              <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={assignment.active} /> Entered</label>
              <button className="mt-3 rounded-lg border border-blue-300 px-3 py-2 text-xs font-black text-blue-800">Save entry</button>
            </form>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-black text-[#081e3a]">Discord channels</h3>
        <form action={createChannel} className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="font-black text-[#081e3a]">Add a secure channel mapping</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="key" required pattern="[A-Z][A-Z0-9_]{1,63}" placeholder="BOT_LOGS" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
            <input name="displayName" required placeholder="Bot Logs" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="channelId" required pattern="\d{16,22}" placeholder="Discord channel ID" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
            <input name="category" required placeholder="STAFF" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input name="reason" required minLength={3} placeholder="Required audit reason" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm font-bold"><input name="active" type="checkbox" defaultChecked /> Active</label>
          </div>
          <button className="mt-3 rounded-lg bg-[#1683ff] px-3 py-2 text-xs font-black text-white">Add channel mapping</button>
        </form>
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
      {owner && <section>
        <h3 className="text-lg font-black text-[#081e3a]">Notification routing</h3>
        <p className="mt-1 text-sm text-slate-600">Choose which website events are sent to each configured Discord channel. Sensitive application fields are never included.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {notificationRoutes.map((route) => (
            <form key={`${route.eventType}:${route.tierId}`} action={saveNotificationRoute} className="rounded-xl border border-slate-200 bg-white p-4">
              <input type="hidden" name="eventType" value={route.eventType} />
              <input type="hidden" name="tierId" value={route.tierId} />
              <p className="font-mono text-xs font-bold text-slate-500">{route.eventType} · {route.tierId}</p>
              <select name="channelKey" required defaultValue={route.channelKey} className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="" disabled>Select a configured channel</option>
                {channels.map((channel) => (
                  <option key={channel.key} value={channel.key}>{channel.displayName} ({channel.key})</option>
                ))}
              </select>
              <input name="reason" required minLength={3} placeholder="Required audit reason" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className="mt-3 flex items-center gap-2 text-sm font-bold"><input name="enabled" type="checkbox" defaultChecked={route.enabled} /> Enabled</label>
              <button className="mt-3 rounded-lg bg-[#1683ff] px-3 py-2 text-xs font-black text-white">Save notification route</button>
            </form>
          ))}
        </div>
      </section>}
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
    tiers: Array<{ name: string; slug: string }>;
    roster: Array<{ id: string; playerId: string; handle: string; tier: { name: string; slug: string }; startsAt: string }>;
    transactions: Array<{ id: string; type: string; status: string; tier: { name: string; slug: string }; createdAt: string }>;
    candidates: Array<{
      playerId: string;
      handle: string;
      division: string;
      tierId: string;
      protectedRosterValue: string;
      status: string;
      rosteredByOtherTeam: boolean;
      eligibleForProposal: boolean;
    }>;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function submitTransaction(formData: FormData) {
    setMessage("Validating and submitting roster proposal…");
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tierId: formData.get("tierId"),
        proposedPlayerIds: formData.getAll("proposedPlayerIds"),
        reason: formData.get("reason"),
      }),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Transaction request saved for League Operations review." : result.error ?? "Transaction request failed");
    if (response.ok) router.refresh();
  }
  if (!data.team) return <div className="mt-7"><Empty text="Your verified Discord account is not assigned to exactly one franchise." /></div>;
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2"><Feedback message={message} /></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-2 rounded-full" style={{ backgroundColor: data.team.primaryColor }} />
        <h3 className="mt-4 text-xl font-black text-[#081e3a]">{data.team.name} roster</h3>
        <div className="mt-4 space-y-2">{data.roster.map((member) => <div key={member.id} className="rounded-lg bg-slate-50 p-3 text-sm font-bold">{member.handle}<span className="ml-2 text-xs uppercase text-slate-400">{member.tier.name}</span></div>)}</div>
        {!data.roster.length && <p className="mt-4 text-sm text-slate-500">No active roster memberships.</p>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-black text-[#081e3a]">Transaction requests</h3>
        <div className="mt-4 space-y-2">{data.transactions.map((transaction) => <div key={transaction.id} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><strong>{transaction.tier.name} · {transaction.type.replaceAll("_", " ")}</strong><span>{transaction.status.replaceAll("_", " ")}</span></div>)}</div>
        {!data.transactions.length && <p className="mt-4 text-sm text-slate-500">No franchise transaction requests.</p>}
      </section>
      {data.tiers.map((tier) => {
        const tierRoster = data.roster.filter((member) => member.tier.slug === tier.slug);
        const tierCandidates = data.candidates.filter((candidate) => candidate.tierId === tier.slug);
        return <section key={tier.slug} className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 lg:col-span-2">
        <h3 className="text-xl font-black text-[#081e3a]">Submit roster transaction</h3>
        <p className="mt-2 text-sm text-slate-600">Propose exactly three {tier.name} players. The backend enforces season and tier isolation before saving.</p>
        <form action={submitTransaction} className="mt-5 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="tierId" value={tier.slug} />
          {[0, 1, 2].map((slot) => (
            <select
              key={slot}
              name="proposedPlayerIds"
              required
              defaultValue={tierRoster[slot]?.playerId ?? ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              aria-label={`Proposed roster player ${slot + 1}`}
            >
              <option value="">Select player</option>
              {tierCandidates.map((candidate) => (
                <option key={candidate.playerId} value={candidate.playerId} disabled={candidate.rosteredByOtherTeam || !candidate.eligibleForProposal}>
                  {candidate.handle} · {candidate.division} · {candidate.protectedRosterValue} PRV{candidate.rosteredByOtherTeam ? " · rostered elsewhere" : !candidate.eligibleForProposal ? ` · ${candidate.status.toLowerCase().replaceAll("_", " ")}` : ""}
                </option>
              ))}
            </select>
          ))}
          <textarea name="reason" required minLength={10} maxLength={2000} rows={3} placeholder="Explain the requested roster change" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm md:col-span-3" />
          <button className="rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white md:col-span-3">Submit transaction</button>
        </form>
      </section>;
      })}
    </div>
  );
}

export function StatisticsWorkspace({
  replays,
  tierId,
}: {
  replays: Array<{ id: string; status: string; player: string; submittedAt: string; parserVersion: string | null }>;
  tierId: TierId;
}) {
  return (
    <div className="mt-7 space-y-3">
      <TierNavigation current={tierId} pathname="/operations/statistics" />
      {replays.map((replay) => <div key={replay.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"><div><strong>{replay.player}</strong><p className="text-xs text-slate-500">{new Date(replay.submittedAt).toLocaleString()} · Parser {replay.parserVersion ?? "pending"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{replay.status.replaceAll("_", " ")}</span></div>)}
      {!replays.length && <Empty text="No replay submissions are stored." />}
    </div>
  );
}

export function ProductionWorkspace({
  data,
}: {
  data: {
    tierId: TierId;
    events: Array<{ id: string; name: string; startsAt: string; endsAt: string }>;
    teams: Array<{ id: string; name: string }>;
    matches: Array<{
      id: string;
      status: string;
      scheduledAt: string;
      teamA: string;
      teamB: string;
      teamAScore: number | null;
      teamBScore: number | null;
    }>;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function verifyResult(formData: FormData) {
    setMessage("Validating season and tier before publishing result…");
    const response = await fetch("/api/admin/operations/matches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: formData.get("id"),
        teamAScore: Number(formData.get("teamAScore")),
        teamBScore: Number(formData.get("teamBScore")),
        officialTie: formData.get("officialTie") === "on",
        reason: formData.get("reason"),
      }),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Result verified in the selected tier." : result.error ?? "Result verification failed");
    if (response.ok) router.refresh();
  }
  async function scheduleMatch(formData: FormData) {
    setMessage("Validating tier entries and creating match…");
    const response = await fetch("/api/admin/operations/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tierId: data.tierId,
        eventId: formData.get("eventId"),
        teamAId: formData.get("teamAId"),
        teamBId: formData.get("teamBId"),
        week: Number(formData.get("week")),
        sundaySlot: Number(formData.get("sundaySlot")),
        bestOf: Number(formData.get("bestOf")),
        scheduledAt: formData.get("scheduledAt"),
        reason: formData.get("reason"),
      }),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Tier-specific match scheduled." : result.error ?? "Match scheduling failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      <div className="lg:col-span-2"><TierNavigation current={data.tierId} pathname="/operations/production" /></div>
      <div className="lg:col-span-2"><Feedback message={message} /></div>
      <form action={scheduleMatch} className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 lg:col-span-2">
        <h3 className="text-lg font-black text-[#081e3a]">Schedule a tier match</h3>
        <p className="mt-1 text-sm text-slate-600">Only teams and events active in the selected tier are accepted by the database.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select name="eventId" required className="rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Select event</option>{data.events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select>
          <select name="teamAId" required className="rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Team A</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
          <select name="teamBId" required className="rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Team B</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
          <input name="scheduledAt" type="datetime-local" required className="rounded-lg border border-slate-300 bg-white p-2.5" aria-label="Scheduled date and time" />
          <input name="week" type="number" min={1} max={52} required placeholder="Week" className="rounded-lg border border-slate-300 p-2.5" />
          <input name="sundaySlot" type="number" min={1} max={20} required placeholder="Match block" className="rounded-lg border border-slate-300 p-2.5" />
          <input name="bestOf" type="number" min={1} max={15} defaultValue={5} required placeholder="Best of" className="rounded-lg border border-slate-300 p-2.5" />
          <input name="reason" minLength={3} required placeholder="Required audit reason" className="rounded-lg border border-slate-300 p-2.5" />
        </div>
        <button className="mt-4 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Schedule match</button>
      </form>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Events</h3><div className="mt-3 space-y-2">{data.events.map((event) => <div key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{event.name}</strong><p className="text-xs text-slate-500">{new Date(event.startsAt).toLocaleDateString()}–{new Date(event.endsAt).toLocaleDateString()}</p></div>)}</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="text-lg font-black">Match production queue</h3><div className="mt-3 space-y-3">{data.matches.map((match) => <div key={match.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{match.teamA} vs {match.teamB}</strong><p className="text-xs text-slate-500">{new Date(match.scheduledAt).toLocaleString()} · {match.status}</p>{match.status === "VERIFIED" ? <p className="mt-2 text-lg font-black">{match.teamAScore}–{match.teamBScore}</p> : <form action={verifyResult} className="mt-3 grid grid-cols-2 gap-2"><input type="hidden" name="id" value={match.id} /><input name="teamAScore" type="number" min={0} max={99} required placeholder={`${match.teamA} score`} className="rounded border border-slate-300 p-2" /><input name="teamBScore" type="number" min={0} max={99} required placeholder={`${match.teamB} score`} className="rounded border border-slate-300 p-2" /><input name="reason" minLength={3} required placeholder="Verification reason" className="col-span-2 rounded border border-slate-300 p-2" /><label className="col-span-2 flex items-center gap-2 text-xs font-bold"><input name="officialTie" type="checkbox" /> Official tie</label><button className="col-span-2 rounded bg-[#1683ff] px-3 py-2 font-black text-white">Verify result</button></form>}</div>)}</div></section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{text}</p>;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUp, Mail, Save } from "lucide-react";
import type { ApplicationQueue } from "@/services/application-admin";
import { readApiResult } from "@/services/api-response";
import { applicationReference } from "@/services/applications";

type QueueItem = Extract<ApplicationQueue, { status: "READY" }>["applications"][number];

const normalTransitions: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "DENIED", "CLOSED"],
  UNDER_REVIEW: ["MORE_INFO_REQUIRED", "APPROVED", "DENIED", "CLOSED"],
  MORE_INFO_REQUIRED: ["UNDER_REVIEW", "DENIED", "CLOSED"],
  APPROVED: ["CLOSED"],
  DENIED: ["CLOSED"],
  WITHDRAWN: [],
  CLOSED: [],
};

function statusLabel(status: string) {
  if (status === "SUBMITTED") return "PENDING";
  if (status === "MORE_INFO_REQUIRED") return "NEEDS CHANGES";
  return status.replaceAll("_", " ");
}

export function ApplicationManager({
  applications,
  reviewers,
  owner,
  page,
  pages,
  total,
}: {
  applications: QueueItem[];
  reviewers: Array<{ id: string; name: string }>;
  owner: boolean;
  page: number;
  pages: number;
  total: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  async function review(formData: FormData) {
    setMessage("Saving review…");
    const id = String(formData.get("applicationId"));
    const status = String(formData.get("status"));
    const applicationName = String(formData.get("applicationName"));
    if (
      ["APPROVED", "DENIED", "MORE_INFO_REQUIRED", "CLOSED"].includes(status)
      && !window.confirm(
        status === "APPROVED"
          ? `Approve ${applicationName}'s complete application and all declared Rocket League accounts?`
          : `Confirm ${statusLabel(status).toLowerCase()} for ${applicationName}?`,
      )
    ) {
      setMessage("Review was not changed.");
      return;
    }
    const response = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        reason: formData.get("reason"),
      }),
    });
    const result = await readApiResult<object>(response);
    if (!response.ok) {
      setMessage(result.error ?? "Review could not be saved");
      return;
    }
    setMessage("Application status updated and audited.");
    router.refresh();
  }

  async function assignReviewer(formData: FormData) {
    setMessage("Assigning reviewer…");
    const id = String(formData.get("applicationId"));
    const reviewerId = String(formData.get("reviewerId")) || null;
    const response = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "ASSIGN_REVIEWER", reviewerId }),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Reviewer assignment saved and audited." : result.error ?? "Reviewer could not be assigned");
    if (response.ok) router.refresh();
  }

  async function addInternalNote(formData: FormData) {
    setMessage("Saving internal note…");
    const id = String(formData.get("applicationId"));
    const response = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "ADD_INTERNAL_NOTE", note: formData.get("note") }),
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Internal note saved and audited." : result.error ?? "Internal note could not be saved");
    if (response.ok) router.refresh();
  }

  async function sendDocument(formData: FormData) {
    setMessage("Sending document…");
    const response = await fetch("/api/applications/send-document", {
      method: "POST",
      body: formData,
    });
    const result = await readApiResult<object>(response);
    setMessage(response.ok ? "Document sent to the configured signup inbox." : result.error ?? "Document could not be sent");
  }

  return (
    <div className="mt-7 space-y-5">
      {message && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900" role="status">{message}</p>
      )}
      <section className="grid gap-4">
        {applications.map((application) => (
          <article key={application.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{application.type.replaceAll("_", " / ")}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{statusLabel(application.reviewStatus)}</span>
                </div>
                <h3 className="mt-3 text-xl font-black text-[#081e3a]">{application.fullName}</h3>
                <p className="mt-1 text-sm text-slate-500">{application.email} · Discord {application.discordUserId}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Submitted {new Date(application.submittedAt).toLocaleString()} · Updated {new Date(application.updatedAt).toLocaleString()}
                </p>
              </div>
              <p className="font-mono text-xs text-slate-500">{applicationReference(application.id)}</p>
            </div>
            <form action={assignReviewer} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
              <input type="hidden" name="applicationId" value={application.id} />
              <label className="text-xs font-black uppercase tracking-wider text-slate-500" htmlFor={`reviewer-${application.id}`}>Assigned reviewer</label>
              <select id={`reviewer-${application.id}`} name="reviewerId" defaultValue={application.assignedReviewerId ?? ""} className="min-w-52 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">Unassigned</option>
                {reviewers.map((reviewer) => <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>)}
              </select>
              <button className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-black text-blue-800">Assign</button>
            </form>
            <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p><strong>Availability:</strong> {application.availability}</p>
              {application.handle && <p><strong>Handle:</strong> {application.handle}</p>}
              {application.type === "PLAYER" && <p><strong>Alternate accounts declared:</strong> {application.alternateAccountsDeclared ? "Yes" : "No"}</p>}
              {application.preferredDepartment && <p><strong>Department:</strong> {application.preferredDepartment}</p>}
              {application.experience && <p className="sm:col-span-2"><strong>Experience:</strong> {application.experience}</p>}
              {application.notes && <p className="sm:col-span-2"><strong>Notes:</strong> {application.notes}</p>}
              {Object.entries(application.answers)
                .filter(([, value]) => value.trim().length > 0)
                .map(([question, answer]) => (
                  <p key={question} className="sm:col-span-2">
                    <strong>{question.replaceAll("_", " ")}:</strong> {answer}
                  </p>
                ))}
            </div>
            {application.type === "PLAYER" && application.epicAccountId && (
              <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow text-blue-700">Declared Rocket League accounts</p>
                    <h4 className="mt-1 font-black text-blue-950">{1 + application.additionalAccounts.length} account record(s)</h4>
                  </div>
                  <span className="rounded-full bg-blue-700 px-3 py-1 text-[10px] font-black text-white">STAFF REVIEW</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[{
                    platform: application.platform ?? "EPIC",
                    accountId: application.epicAccountId,
                    trackerUrl: application.trackerUrl ?? "",
                  }, ...application.additionalAccounts].map((account, index) => (
                    <article key={`${account.platform}-${account.accountId}-${index}`} className="rounded-lg border border-blue-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[.1em] text-blue-700">{index === 0 ? "Primary account" : `Additional account ${index}`}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{account.platform}</span>
                      </div>
                      <p className="mt-3 break-all font-mono text-sm font-bold text-[#061426]">{account.accountId}</p>
                      {account.trackerUrl
                        ? <a href={account.trackerUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs font-bold text-blue-700 underline">Open tracker profile</a>
                        : <p className="mt-2 text-xs text-slate-400">No tracker URL provided</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}
            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer font-black text-[#061426]">Application review history · {application.reviewHistory.length} event(s)</summary>
              <div className="mt-4 space-y-2">
                {application.reviewHistory.map((event) => (
                  <div key={`${event.createdAt}-${event.toStatus}`} className="grid gap-2 rounded-lg bg-white p-3 text-sm sm:grid-cols-[auto_1fr_auto]">
                    <span className="font-black text-[#061426]">{event.fromStatus?.replaceAll("_", " ") ?? "Created"} → {event.toStatus.replaceAll("_", " ")}</span>
                    <span className="text-slate-600">{event.reason ?? "No reason recorded"}</span>
                    <span className="text-xs text-slate-400">{event.actor} · {new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {!application.reviewHistory.length && <p className="text-sm text-slate-500">No review-history events are stored for this application.</p>}
              </div>
            </details>
            <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <summary className="cursor-pointer font-black text-amber-950">Internal staff notes · {application.staffNotes.length}</summary>
              <div className="mt-4 space-y-2">
                {application.staffNotes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-white p-3 text-sm">
                    <p className="whitespace-pre-wrap text-slate-700">{note.body}</p>
                    <p className="mt-2 text-xs text-slate-400">{note.author} · {new Date(note.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {!application.staffNotes.length && <p className="text-sm text-slate-500">No internal staff notes have been recorded.</p>}
                <form action={addInternalNote} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="applicationId" value={application.id} />
                  <textarea name="note" required minLength={3} maxLength={5000} rows={2} placeholder="Add a private note for authorized staff" className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" />
                  <button className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-black text-white">Add note</button>
                </form>
              </div>
            </details>
            {(owner || (normalTransitions[application.reviewStatus]?.length ?? 0) > 0) && (
            <form action={review} className="mt-5 grid gap-3 sm:grid-cols-[13rem_1fr_auto]">
              <input type="hidden" name="applicationId" value={application.id} />
              <input type="hidden" name="applicationName" value={application.fullName} />
              <select name="status" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold">
                {(owner
                  ? ["UNDER_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "DENIED", "CLOSED"].filter((status) => status !== application.reviewStatus)
                  : normalTransitions[application.reviewStatus] ?? []
                ).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <input name="reason" required minLength={3} maxLength={2000} placeholder="Required review reason" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">
                <Save size={15} /> Save
              </button>
            </form>
            )}
          </article>
        ))}
        {applications.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No applications have been submitted.</p>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 text-sm">
            <span>{total} applications · Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/operations/applications?page=${page - 1}`} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-bold">Previous</Link>}
              {page < pages && <Link href={`/operations/applications?page=${page + 1}`} className="rounded border border-slate-300 bg-white px-3 py-1.5 font-bold">Next</Link>}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <Mail className="text-[#1683ff]" />
          <div>
            <h3 className="font-black text-[#081e3a]">Send document to signup inbox</h3>
            <p className="text-sm text-slate-500">PDF, DOCX, PNG, or JPEG · Maximum 2 MB</p>
          </div>
        </div>
        <form action={sendDocument} className="mt-5 grid gap-4">
          <select name="applicationId" className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm">
            <option value="">General signup document</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>{application.fullName} · {application.type}</option>
            ))}
          </select>
          <input name="subject" required minLength={3} maxLength={160} placeholder="Email subject" className="rounded-lg border border-slate-300 px-4 py-3 text-sm" />
          <textarea name="message" required minLength={3} maxLength={5000} rows={3} placeholder="Message for the signup inbox" className="rounded-lg border border-slate-300 px-4 py-3 text-sm" />
          <label className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm font-bold text-slate-600">
            <FileUp size={19} />
            <input name="document" type="file" required accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" />
          </label>
          <button className="w-fit rounded-lg bg-[#081e3a] px-5 py-3 text-sm font-black text-white">Send document</button>
        </form>
      </section>
    </div>
  );
}

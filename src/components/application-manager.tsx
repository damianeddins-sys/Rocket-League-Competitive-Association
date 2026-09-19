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
  SUBMITTED: ["UNDER_REVIEW", "DENIED"],
  UNDER_REVIEW: ["MORE_INFO_REQUIRED", "APPROVED", "DENIED"],
  MORE_INFO_REQUIRED: ["UNDER_REVIEW", "DENIED"],
  APPROVED: [],
  DENIED: [],
  WITHDRAWN: [],
};

export function ApplicationManager({
  applications,
  owner,
  page,
  pages,
  total,
}: {
  applications: QueueItem[];
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
    if (
      ["APPROVED", "DENIED"].includes(status)
      && !window.confirm(`Confirm application status change to ${status.replaceAll("_", " ")}?`)
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
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{application.reviewStatus.replaceAll("_", " ")}</span>
                </div>
                <h3 className="mt-3 text-xl font-black text-[#081e3a]">{application.fullName}</h3>
                <p className="mt-1 text-sm text-slate-500">{application.email} · Discord {application.discordUserId}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Submitted {new Date(application.submittedAt).toLocaleString()} · Updated {new Date(application.updatedAt).toLocaleString()}
                </p>
              </div>
              <p className="font-mono text-xs text-slate-500">{applicationReference(application.id)}</p>
            </div>
            <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p><strong>Availability:</strong> {application.availability}</p>
              {application.handle && <p><strong>Handle:</strong> {application.handle}</p>}
              {application.platform && <p><strong>Platform:</strong> {application.platform}</p>}
              {application.epicAccountId && <p><strong>Epic:</strong> {application.epicAccountId}</p>}
              {application.trackerUrl && <p className="break-all"><strong>Tracker:</strong> <a href={application.trackerUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open profile</a></p>}
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
            {(owner || (normalTransitions[application.reviewStatus]?.length ?? 0) > 0) && (
            <form action={review} className="mt-5 grid gap-3 sm:grid-cols-[13rem_1fr_auto]">
              <input type="hidden" name="applicationId" value={application.id} />
              <select name="status" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold">
                {(owner
                  ? ["UNDER_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "DENIED"].filter((status) => status !== application.reviewStatus)
                  : normalTransitions[application.reviewStatus] ?? []
                ).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
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

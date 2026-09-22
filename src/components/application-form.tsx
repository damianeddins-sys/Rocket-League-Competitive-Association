"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import type { ApplicationType } from "@/services/applications";
import { readApiResult } from "@/services/api-response";

export function ApplicationForm({
  type,
  defaultName,
  defaultEmail,
}: {
  type: ApplicationType;
  defaultName: string;
  defaultEmail: string;
}) {
  const [step, setStep] = useState(1);
  const [additionalAccounts, setAdditionalAccounts] = useState<Array<{
    platform: string;
    accountId: string;
    trackerUrl: string;
  }>>([]);
  const [state, setState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    reference?: string;
  }>({ status: "idle" });

  async function submit(formData: FormData) {
    setState({ status: "submitting" });
    const payload = Object.fromEntries(formData.entries());
    const accountDisclosure = additionalAccounts
      .filter((account) => account.accountId.trim())
      .map((account, index) =>
        `Additional account ${index + 1}: ${account.platform || "Platform not selected"} · ${account.accountId.trim()}${account.trackerUrl.trim() ? ` · ${account.trackerUrl.trim()}` : ""}`,
      )
      .join("\n");
    const notes = [String(payload.notes ?? "").trim(), accountDisclosure]
      .filter(Boolean)
      .join("\n\n");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          type,
          notes,
          agreementsAccepted: payload.agreementsAccepted === "on",
          alternateAccountsDeclared: payload.alternateAccountsDeclared === "on" || additionalAccounts.length > 0,
        }),
      });
      const result = await readApiResult<{ id?: string; reference?: string }>(response);
      if (!response.ok) throw new Error(result.error ?? "Application could not be submitted");
      setState({
        status: "success",
        reference: result.reference,
        message: "Your application has been saved and added to the RLCA review queue.",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Application could not be submitted",
      });
    }
  }

  function advance(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const fieldset = form?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const fields = [...(fieldset?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select") ?? [])];
    const invalid = fields.find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep((value) => Math.min(7, value + 1));
  }

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center" role="status">
        <p className="eyebrow text-emerald-700">Application received</p>
        <h2 className="mt-3 text-2xl font-black text-emerald-950">You are in the review queue.</h2>
        <p className="mt-3 text-emerald-800">{state.message}</p>
        <p className="mt-4 font-mono text-sm font-black text-emerald-700">Application ID: {state.reference ?? "Created"}</p>
        <Link href={`/applications/apply?type=${type.toLowerCase().replace("_", "-")}`} className="mt-6 inline-flex rounded-lg bg-emerald-700 px-5 py-3 font-black text-white">
          View application
        </Link>
      </div>
    );
  }

  const stepLabels = [
    "Basic Information",
    "Rocket League Accounts",
    "Competitive History",
    "Availability",
    "Additional Information",
    "Review",
    "Submit",
  ];
  const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal";

  return (
    <form action={submit} className="operations-shell overflow-hidden">
      <div className="border-b border-slate-200 bg-[#061426] px-6 py-6 text-white sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-blue-300">Official registration workflow</p>
            <h2 className="mt-2 text-2xl font-black">{stepLabels[step - 1]}</h2>
          </div>
          <span className="font-mono text-xs font-black text-slate-400">STEP {step} / 7</span>
        </div>
        <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label={`Application step ${step} of 7`}>
          {stepLabels.map((label, index) => (
            <li key={label}>
              <span className={`block h-1.5 rounded-full ${index + 1 <= step ? "bg-[#168bff]" : "bg-white/15"}`} />
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="min-h-[28rem] p-6 sm:p-8 lg:p-10">
        <fieldset data-step="1" className={step === 1 ? "grid gap-6 sm:grid-cols-2" : "hidden"}>
          <legend className="sr-only">Basic information</legend>
          <div className="sm:col-span-2"><p className="eyebrow text-[#168bff]">Tell us who you are</p><p className="mt-2 text-sm leading-6 text-slate-600">Use current contact information so authorized league staff can follow up on this application.</p></div>
          <label className="text-sm font-bold text-slate-700">Full name<input name="fullName" defaultValue={defaultName} required minLength={2} maxLength={120} className={fieldClass} /></label>
          <label className="text-sm font-bold text-slate-700">Contact email<input name="email" type="email" defaultValue={defaultEmail} required maxLength={254} className={fieldClass} /></label>
          {type === "STAFF" && (
            <label className="text-sm font-bold text-slate-700 sm:col-span-2">Preferred department
              <select name="preferredDepartment" required className={fieldClass}>
                <option value="">Select a department</option><option>League Administration</option><option>Moderation</option><option>Production</option><option>Statistics</option><option>Roster Administration</option>
              </select>
            </label>
          )}
        </fieldset>

        <fieldset data-step="2" className={step === 2 ? "grid gap-5" : "hidden"}>
          <legend className="sr-only">Rocket League accounts</legend>
          <div><p className="eyebrow text-[#168bff]">Identity verification</p><h3 className="mt-2 text-2xl font-black text-[#061426]">Rocket League accounts</h3><p className="mt-2 text-sm leading-6 text-slate-600">{type === "PLAYER" ? "Declare the primary account used for verification and every additional competitive account." : "Rocket League account verification is completed during role-specific staff review when applicable."}</p></div>
          {type === "PLAYER" ? (
            <>
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/60 p-5">
                <div className="mb-4 flex items-center justify-between"><p className="text-sm font-black text-blue-950">PRIMARY ACCOUNT</p><span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white">REQUIRED</span></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700">Primary platform<select name="platform" required className={fieldClass}><option value="">Select platform</option><option value="EPIC">Epic</option><option value="STEAM">Steam</option><option value="XBOX">Xbox</option><option value="PLAYSTATION">PlayStation</option><option value="SWITCH">Nintendo Switch</option></select></label>
                  <label className="text-sm font-bold text-slate-700">Epic account ID<input name="epicAccountId" required maxLength={120} className={fieldClass} /></label>
                  <label className="text-sm font-bold text-slate-700 sm:col-span-2">Tracker profile URL <span className="font-normal text-slate-400">(optional)</span><input name="trackerUrl" type="url" placeholder="https://rocketleague.tracker.network/..." className={fieldClass} /></label>
                </div>
              </div>
              {additionalAccounts.map((account, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between"><p className="text-sm font-black text-slate-700">ADDITIONAL ACCOUNT {index + 1}</p><button type="button" onClick={() => setAdditionalAccounts((accounts) => accounts.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Remove additional account ${index + 1}`}><Trash2 size={17} /></button></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-700">Platform<select value={account.platform} onChange={(event) => setAdditionalAccounts((accounts) => accounts.map((item, itemIndex) => itemIndex === index ? { ...item, platform: event.target.value } : item))} className={fieldClass}><option value="">Select platform</option><option value="EPIC">Epic</option><option value="STEAM">Steam</option><option value="XBOX">Xbox</option><option value="PLAYSTATION">PlayStation</option><option value="SWITCH">Nintendo Switch</option></select></label>
                    <label className="text-sm font-bold text-slate-700">Account ID<input value={account.accountId} maxLength={120} onChange={(event) => setAdditionalAccounts((accounts) => accounts.map((item, itemIndex) => itemIndex === index ? { ...item, accountId: event.target.value } : item))} className={fieldClass} /></label>
                    <label className="text-sm font-bold text-slate-700 sm:col-span-2">Tracker URL <span className="font-normal text-slate-400">(optional)</span><input value={account.trackerUrl} type="url" onChange={(event) => setAdditionalAccounts((accounts) => accounts.map((item, itemIndex) => itemIndex === index ? { ...item, trackerUrl: event.target.value } : item))} className={fieldClass} /></label>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setAdditionalAccounts((accounts) => [...accounts, { platform: "", accountId: "", trackerUrl: "" }])} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-5 py-4 text-sm font-black text-blue-800 hover:bg-blue-50"><Plus size={17} /> Add another account</button>
              <input name="alternateAccountsDeclared" type="hidden" value={additionalAccounts.length ? "on" : ""} />
            </>
          ) : <div className="empty-stage"><p className="font-black text-[#061426]">No account details required at this stage</p><p className="mt-2 text-sm text-slate-600">Continue to the role-specific experience section.</p></div>}
        </fieldset>

        <fieldset data-step="3" className={step === 3 ? "grid gap-5" : "hidden"}>
          <legend className="sr-only">Competitive history</legend>
          <div><p className="eyebrow text-[#168bff]">Experience and fit</p><h3 className="mt-2 text-2xl font-black text-[#061426]">Competitive history</h3></div>
          {type === "PLAYER" ? (
            <label className="text-sm font-bold text-slate-700">Competitive handle<input name="handle" required maxLength={64} className={fieldClass} /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Use the name you want associated with official RLCA records.</span></label>
          ) : (
            <label className="text-sm font-bold text-slate-700">Relevant experience<textarea name="experience" required minLength={20} maxLength={3000} rows={7} className={fieldClass} /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Describe relevant competitive, leadership, production, moderation, ownership, or operations experience.</span></label>
          )}
        </fieldset>

        <fieldset data-step="4" className={step === 4 ? "grid gap-5" : "hidden"}>
          <legend className="sr-only">Availability</legend>
          <div><p className="eyebrow text-[#168bff]">Schedule and timezone</p><h3 className="mt-2 text-2xl font-black text-[#061426]">Availability</h3><p className="mt-2 text-sm leading-6 text-slate-600">Give staff a clear picture of when you can participate in the official league workflow.</p></div>
          <label className="text-sm font-bold text-slate-700">Days, times, and timezone<textarea name="availability" required minLength={2} maxLength={1000} rows={7} placeholder="Example: Monday–Thursday after 7 PM Eastern" className={fieldClass} /></label>
        </fieldset>

        <fieldset data-step="5" className={step === 5 ? "grid gap-5" : "hidden"}>
          <legend className="sr-only">Additional information</legend>
          <div><p className="eyebrow text-[#168bff]">Context for reviewers</p><h3 className="mt-2 text-2xl font-black text-[#061426]">Additional information</h3><p className="mt-2 text-sm leading-6 text-slate-600">Add only information that helps authorized RLCA staff review your application.</p></div>
          <label className="text-sm font-bold text-slate-700">Additional information <span className="font-normal text-slate-400">(optional)</span><textarea name="notes" maxLength={3000} rows={8} className={fieldClass} /></label>
        </fieldset>

        <fieldset data-step="6" className={step === 6 ? "grid gap-5" : "hidden"}>
          <legend className="sr-only">Review</legend>
          <div><p className="eyebrow text-[#168bff]">Before you submit</p><h3 className="mt-2 text-2xl font-black text-[#061426]">Review your application</h3><p className="mt-3 max-w-2xl leading-7 text-slate-600">Use Back to confirm every field. Staff decisions rely on the exact information provided, and approved records may become part of official league operations.</p></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Identity complete", type === "PLAYER" ? `${1 + additionalAccounts.length} account record(s)` : "Role details complete", "Availability complete"].map((label, index) => <div key={label} className="metric-tile"><p className="font-mono text-xs font-black text-[#168bff]">0{index + 1}</p><p className="mt-3 text-sm font-black text-[#061426]">{label}</p></div>)}
          </div>
        </fieldset>

        <fieldset data-step="7" className={step === 7 ? "grid gap-5" : "hidden"}>
          <legend className="sr-only">Submit application</legend>
          <div><p className="eyebrow text-[#168bff]">Official submission</p><h3 className="mt-2 text-2xl font-black text-[#061426]">Submit for staff review</h3><p className="mt-3 max-w-2xl leading-7 text-slate-600">Submission creates an official database record and enters the authorized review queue. It does not automatically grant a player, staff, team, or franchise role.</p></div>
          <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            <input name="agreementsAccepted" type="checkbox" required className="mt-1 h-4 w-4" />
            I confirm this information is accurate and agree to the published RLCA rules, verification requirements, and staff review process.
          </label>
        </fieldset>
      </div>

      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
        {step > 1 ? <button type="button" onClick={() => setStep((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-black text-slate-700">Back</button> : <span />}
        {step < 7 ? <button type="button" onClick={advance} className="rounded-lg bg-[#1683ff] px-7 py-3 font-black text-white shadow-lg shadow-blue-500/15">Continue</button> : <button disabled={state.status === "submitting"} className="rounded-lg bg-[#1683ff] px-7 py-3 font-black text-white shadow-lg shadow-blue-500/15 disabled:cursor-wait disabled:bg-slate-400">{state.status === "submitting" ? "Submitting…" : "Submit application"}</button>}
      </div>
      {state.status === "error" && <p className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{state.message}</p>}
    </form>
  );
}

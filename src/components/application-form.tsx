"use client";

import { useState } from "react";
import type { ApplicationType } from "@/services/applications";

export function ApplicationForm({
  type,
  defaultName,
  defaultEmail,
}: {
  type: ApplicationType;
  defaultName: string;
  defaultEmail: string;
}) {
  const [state, setState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message?: string;
    id?: string;
  }>({ status: "idle" });

  async function submit(formData: FormData) {
    setState({ status: "submitting" });
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          type,
          agreementsAccepted: payload.agreementsAccepted === "on",
          alternateAccountsDeclared: payload.alternateAccountsDeclared === "on",
        }),
      });
      const result = await response.json() as { error?: string; id?: string };
      if (!response.ok) throw new Error(result.error ?? "Application could not be submitted");
      setState({
        status: "success",
        id: result.id,
        message: "Your application has been saved and added to the RLCA review queue.",
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Application could not be submitted",
      });
    }
  }

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center" role="status">
        <p className="eyebrow text-emerald-700">Application received</p>
        <h2 className="mt-3 text-2xl font-black text-emerald-950">You are in the review queue.</h2>
        <p className="mt-3 text-emerald-800">{state.message}</p>
        <p className="mt-4 font-mono text-xs text-emerald-700">Reference: {state.id}</p>
      </div>
    );
  }

  return (
    <form action={submit} className="panel p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Full name
          <input name="fullName" defaultValue={defaultName} required minLength={2} maxLength={120} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Contact email
          <input name="email" type="email" defaultValue={defaultEmail} required maxLength={254} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
        </label>
        {type === "PLAYER" && (
          <>
            <label className="text-sm font-bold text-slate-700">
              Competitive handle
              <input name="handle" required maxLength={64} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Primary platform
              <select name="platform" required className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-500">
                <option value="">Select platform</option>
                <option value="EPIC">Epic</option>
                <option value="STEAM">Steam</option>
                <option value="XBOX">Xbox</option>
                <option value="PLAYSTATION">PlayStation</option>
                <option value="SWITCH">Nintendo Switch</option>
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Epic account ID
              <input name="epicAccountId" required maxLength={120} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Tracker profile URL
              <input name="trackerUrl" type="url" placeholder="https://rocketleague.tracker.network/..." className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-700 sm:col-span-2">
              <input name="alternateAccountsDeclared" type="checkbox" className="h-4 w-4" />
              I have declared every alternate Rocket League account in the additional information field.
            </label>
          </>
        )}
        {type === "STAFF" && (
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">
            Preferred department
            <select name="preferredDepartment" required className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-500">
              <option value="">Select a department</option>
              <option>League Administration</option>
              <option>Moderation</option>
              <option>Production</option>
              <option>Statistics</option>
              <option>Roster Administration</option>
            </select>
          </label>
        )}
        {type !== "PLAYER" && (
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">
            Relevant experience
            <textarea name="experience" required minLength={20} maxLength={3000} rows={5} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
          </label>
        )}
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Availability
          <textarea name="availability" required minLength={2} maxLength={1000} rows={3} placeholder="Days, times, and timezone" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Additional information <span className="font-normal text-slate-400">(optional)</span>
          <textarea name="notes" maxLength={3000} rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500" />
        </label>
      </div>
      <label className="mt-6 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <input name="agreementsAccepted" type="checkbox" required className="mt-1 h-4 w-4" />
        I confirm this information is accurate and agree to the published RLCA rules, verification requirements, and staff review process.
      </label>
      <button disabled={state.status === "submitting"} className="mt-6 rounded-lg bg-[#1683ff] px-6 py-3 font-black text-white disabled:cursor-wait disabled:bg-slate-400">
        {state.status === "submitting" ? "Submitting…" : "Submit application"}
      </button>
      {state.status === "error" && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{state.message}</p>
      )}
    </form>
  );
}

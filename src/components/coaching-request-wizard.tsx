"use client";

import { useState, type FormEvent } from "react";

type CoachingType = "TEAM_2V2" | "INDIVIDUAL_1V1";
type CoachingGoal = "BEST_ROSTER" | "GAMEPLAY_IMPROVEMENT" | "BOTH" | "INDIVIDUAL_REVIEW";

export function CoachingRequestWizard() {
  const [type, setType] = useState<CoachingType | null>(null);
  const [goal, setGoal] = useState<CoachingGoal | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"TYPE" | "GOAL" | "UPLOAD" | "REVIEW" | "PROCESSING" | "RESULTS">("TYPE");
  const [message, setMessage] = useState("");

  function selectType(next: CoachingType) {
    setType(next);
    if (next === "INDIVIDUAL_1V1") {
      setGoal("INDIVIDUAL_REVIEW");
      setStep("UPLOAD");
    } else {
      setGoal(null);
      setStep("GOAL");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!type || !goal || !file) return;
    setStep("PROCESSING");
    setMessage("Submitting replay securely…");
    const form = new FormData(event.currentTarget);
    form.set("coachingType", type);
    form.set("coachingGoal", goal);
    form.set("replay", file);
    const response = await fetch("/api/coach/replays", { method: "POST", body: form });
    const result = await response.json() as { error?: string; id?: string; status?: string };
    if (!response.ok) {
      setMessage(result.error ?? "Replay submission failed");
      setStep("REVIEW");
      return;
    }
    setMessage(`Request ${result.id?.slice(0, 8)} is ${result.status?.toLowerCase()}. Results will use only available replay evidence.`);
    setStep("RESULTS");
  }

  const button = "rounded-xl border border-slate-200 bg-white p-5 text-left text-sm font-black hover:border-emerald-400 hover:bg-emerald-50";
  return <div className="panel p-6 sm:p-8">
    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
      {["TYPE", type === "TEAM_2V2" ? "GOAL" : null, "UPLOAD", "REVIEW", "PROCESSING", "RESULTS"].filter(Boolean).map((item) =>
        <span key={item} className={`rounded-full px-3 py-1 ${step === item ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{item}</span>)}
    </div>
    {step === "TYPE" && <div className="mt-7"><h2 className="text-2xl font-black">What type of coaching do you need?</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><button className={button} onClick={() => selectType("TEAM_2V2")}>Team / 2v2<span className="mt-2 block font-medium text-slate-500">Roster fit and team gameplay analysis.</span></button><button className={button} onClick={() => selectType("INDIVIDUAL_1V1")}>1v1 / Individual<span className="mt-2 block font-medium text-slate-500">Personal mechanics, decisions, offense, and defense.</span></button></div></div>}
    {step === "GOAL" && <div className="mt-7"><h2 className="text-2xl font-black">What do you want help with?</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{([
      ["BEST_ROSTER", "Best roster + why", "Evidence-based 2-player fit and possible substitute."],
      ["GAMEPLAY_IMPROVEMENT", "Gameplay improvement", "Positioning, rotations, decisions, and priorities."],
      ["BOTH", "Both", "Roster fit plus complete gameplay review."],
    ] as const).map(([value, label, description]) => <button key={value} className={button} onClick={() => { setGoal(value); setStep("UPLOAD"); }}>{label}<span className="mt-2 block font-medium text-slate-500">{description}</span></button>)}</div></div>}
    {step === "UPLOAD" && <div className="mt-7"><h2 className="text-2xl font-black">Upload replay</h2><p className="mt-2 text-sm text-slate-600">Your selections are saved with the private replay. Analysis will not invent abilities that the replay cannot support.</p><label className="mt-5 block rounded-xl border border-dashed border-emerald-400 bg-emerald-50 p-6 text-sm font-bold">Rocket League replay<input className="mt-3 block w-full text-sm" type="file" accept=".replay" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><div className="mt-5 flex gap-3"><button className="rounded-lg border px-4 py-2 text-sm font-bold" onClick={() => setStep("TYPE")}>Start over</button><button disabled={!file} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40" onClick={() => setStep("REVIEW")}>Review request</button></div></div>}
    {step === "REVIEW" && <form className="mt-7" onSubmit={submit}><h2 className="text-2xl font-black">Review and submit</h2><dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-5 text-sm sm:grid-cols-3"><div><dt className="stat-label">Type</dt><dd className="mt-1 font-black">{type?.replaceAll("_", " ")}</dd></div><div><dt className="stat-label">Goal</dt><dd className="mt-1 font-black">{goal?.replaceAll("_", " ")}</dd></div><div><dt className="stat-label">Replay</dt><dd className="mt-1 truncate font-black">{file?.name}</dd></div></dl><label className="mt-5 block text-sm font-bold">Context for the coach<textarea name="reviewNotes" maxLength={2000} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label><div className="mt-5 flex gap-3"><button type="button" className="rounded-lg border px-4 py-2 text-sm font-bold" onClick={() => setStep("UPLOAD")}>Back</button><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white">Submit privately</button></div>{message && <p className="mt-4 text-sm font-bold text-red-700">{message}</p>}</form>}
    {step === "PROCESSING" && <div className="mt-8 rounded-xl bg-slate-50 p-8 text-center"><h2 className="text-xl font-black">Processing</h2><p className="mt-2 text-sm text-slate-600">{message}</p></div>}
    {step === "RESULTS" && <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-8"><h2 className="text-xl font-black text-emerald-900">Request received</h2><p className="mt-2 text-sm leading-6 text-emerald-800">{message}</p></div>}
  </div>;
}

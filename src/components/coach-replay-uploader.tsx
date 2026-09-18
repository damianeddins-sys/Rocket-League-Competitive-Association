"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export function CoachReplayUploader() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<{
    status: "idle" | "uploading" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  async function upload(formData: FormData) {
    setState({ status: "uploading", message: "Uploading securely…" });
    try {
      const response = await fetch("/api/coach/replays", { method: "POST", body: formData });
      const result = await response.json() as { error?: string; id?: string };
      if (!response.ok) throw new Error(result.error ?? "Replay upload failed");
      formRef.current?.reset();
      setState({
        status: "success",
        message: `Replay received. Processing reference: ${result.id?.slice(0, 8) ?? "created"}`,
      });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Replay upload failed",
      });
    }
  }

  return (
    <form
      ref={formRef}
      action={upload}
      className="rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-6"
    >
      <UploadCloud className="text-[#1683ff]" size={30} />
      <h3 className="mt-4 text-xl font-black text-[#081e3a]">Upload replay evidence</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Submit a Rocket League <code>.replay</code> file up to 4 MB. Reports are created only after parsing and evidence validation.
      </p>
      <label className="mt-5 block text-sm font-bold text-slate-700">
        Replay file
        <input
          type="file"
          name="replay"
          accept=".replay,application/octet-stream"
          required
          className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[#081e3a] file:px-4 file:py-2 file:font-bold file:text-white"
        />
      </label>
      <label className="mt-4 block text-sm font-bold text-slate-700">
        Official match ID <span className="font-normal text-slate-400">(optional)</span>
        <input
          name="matchId"
          inputMode="text"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm outline-none focus:border-blue-500"
          placeholder="Link this replay to an official match"
        />
      </label>
      <button
        type="submit"
        disabled={state.status === "uploading"}
        className="mt-5 rounded-lg bg-[#1683ff] px-5 py-3 text-sm font-black text-white disabled:cursor-wait disabled:bg-slate-400"
      >
        {state.status === "uploading" ? "Uploading…" : "Submit for analysis"}
      </button>
      {state.message && (
        <p
          role="status"
          className={`mt-4 rounded-lg p-3 text-sm font-semibold ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-800"
              : state.status === "error"
                ? "bg-red-50 text-red-800"
                : "bg-white text-slate-600"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

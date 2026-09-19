"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MediaUploader() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  async function upload(formData: FormData) {
    setMessage("Uploading image…");
    const response = await fetch("/api/admin/media", { method: "POST", body: formData });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Image uploaded, saved, and audited." : result.error ?? "Image upload failed");
    if (response.ok) router.refresh();
  }
  return (
    <div className="mt-7">
      {message && <p className="mb-4 rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-900" role="status">{message}</p>}
      <form action={upload} className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <p className="eyebrow text-blue-700">Upload or replace website image</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">Media key<input name="key" required pattern="[a-z0-9-]+" placeholder="homepage-hero" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono font-normal" /></label>
          <label className="text-sm font-bold">Title<input name="title" required maxLength={160} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="text-sm font-bold sm:col-span-2">Description<input name="body" required maxLength={2000} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="text-sm font-bold">Image<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-bold">Display order<input name="sortOrder" type="number" min={0} max={10000} defaultValue={0} required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" /></label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input name="published" type="checkbox" defaultChecked /> Published</label>
        <button className="mt-4 rounded-lg bg-[#1683ff] px-4 py-2.5 text-sm font-black text-white">Upload image</button>
      </form>
    </div>
  );
}

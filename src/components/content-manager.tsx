"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContentCategory } from "@/services/site-content";

type ContentItem = {
  id: string;
  key: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  published: boolean;
  sortOrder: number;
};

function ContentForm({
  category,
  item,
  onSave,
}: {
  category: ContentCategory;
  item?: ContentItem;
  onSave: (form: FormData) => Promise<void>;
}) {
  return (
    <form action={onSave} className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Content key
          <input name="key" required pattern="[a-z0-9-]+" defaultValue={item?.key} placeholder="unique-content-key" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Display order
          <input name="sortOrder" required type="number" min={0} max={10000} defaultValue={item?.sortOrder ?? 0} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Title
          <input name="title" required minLength={2} maxLength={160} defaultValue={item?.title} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Content
          <textarea name="body" required minLength={2} maxLength={20000} rows={5} defaultValue={item?.body} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Media URL <span className="font-normal text-slate-400">(optional HTTPS URL)</span>
          <input name="mediaUrl" type="url" defaultValue={item?.mediaUrl ?? ""} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
      </div>
      <input type="hidden" name="category" value={category} />
      <label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-700">
        <input name="published" type="checkbox" defaultChecked={item?.published} /> Published
      </label>
      <button className="mt-5 rounded-lg bg-[#1683ff] px-5 py-2.5 text-sm font-black text-white">
        {item ? "Save changes" : "Create content"}
      </button>
    </form>
  );
}

export function ContentManager({
  category,
  items,
}: {
  category: ContentCategory;
  items: ContentItem[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  async function save(formData: FormData) {
    setMessage("Saving…");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        published: payload.published === "on",
        sortOrder: Number(payload.sortOrder),
      }),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Content saved and audited." : result.error ?? "Content could not be saved");
    if (response.ok) router.refresh();
  }

  async function remove(formData: FormData) {
    if (!window.confirm("Remove this content from the website and database?")) return;
    const response = await fetch("/api/admin/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await response.json() as { error?: string };
    setMessage(response.ok ? "Content removed and audited." : result.error ?? "Content could not be removed");
    if (response.ok) router.refresh();
  }

  return (
    <div className="mt-7 space-y-5">
      {message && <p className="rounded-lg bg-blue-50 p-4 text-sm font-semibold text-blue-900" role="status">{message}</p>}
      {items.map((item) => (
        <div key={item.id}>
          <ContentForm category={category} item={item} onSave={save} />
          <form action={remove} className="-mt-16 mr-5 flex justify-end pb-5">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="reason" value="Removed through Operations content management" />
            <button className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-black text-red-700">Remove</button>
          </form>
        </div>
      ))}
      <div>
        <p className="eyebrow mb-3 text-[#1683ff]">New {category.toLowerCase().replaceAll("_", " ")} entry</p>
        <ContentForm category={category} onSave={save} />
      </div>
    </div>
  );
}

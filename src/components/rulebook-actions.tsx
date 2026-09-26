"use client";

export function RulebookActions({ documentId }: { documentId: string }) {
  const viewUrl = `/api/rules/${documentId}`;
  return <div className="flex flex-wrap gap-2">
    <a href={viewUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white">Open PDF</a>
    <a href={`${viewUrl}?download=1`} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-black text-emerald-800">Download PDF</a>
    <button type="button" onClick={() => {
      const frame = document.getElementById("rulebook-frame") as HTMLIFrameElement | null;
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-black">Print</button>
  </div>;
}

"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f4f7fb] px-5 py-16">
      <div className="panel max-w-xl p-9 text-center">
        <p className="eyebrow text-red-600">Something went wrong</p>
        <h1 className="mt-3 text-3xl font-black text-[#061426]">We couldn&apos;t load this information.</h1>
        <p className="mt-4 leading-7 text-slate-600">The technical error was logged privately. Try the request again.</p>
        <button onClick={reset} className="mt-7 rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Try again</button>
      </div>
    </main>
  );
}

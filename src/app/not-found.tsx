import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="esports-surface flex min-h-[70vh] items-center justify-center px-5 py-20 text-white">
      <div className="max-w-xl text-center">
        <p className="stat-number text-8xl text-blue-300">404</p>
        <h1 className="mt-5 text-4xl font-black">This page isn&apos;t part of the league.</h1>
        <p className="mt-4 leading-7 text-slate-300">The route may have moved, or the requested league record does not exist.</p>
        <Link href="/" className="mt-8 inline-flex rounded-lg bg-[#168bff] px-5 py-3 font-black">Return home</Link>
      </div>
    </main>
  );
}

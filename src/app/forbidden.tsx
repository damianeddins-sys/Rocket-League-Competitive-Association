import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="min-h-[70vh] bg-[#f3f6fa] px-5 py-20">
      <section className="panel mx-auto max-w-xl p-8 text-center">
        <ShieldAlert className="mx-auto text-red-500" size={38} />
        <p className="eyebrow mt-6 text-red-600">403 · Protected RLCA system</p>
        <h1 className="mt-3 text-3xl font-black text-[#081e3a]">You do not have permission to open this workspace</h1>
        <p className="mt-4 leading-7 text-slate-600">
          Your Discord identity is signed in, but its current RLCA roles and database assignments do not authorize this page.
        </p>
        <Link href="/dashboard" className="mt-7 inline-flex rounded-lg bg-[#1683ff] px-5 py-3 font-black text-white">
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <section className="flex min-h-[72vh] items-center bg-[#f4f7fa] px-5 py-16">
      <div className="panel mx-auto w-full max-w-md p-8 text-center">
        <Image
          src="/branding/rlca-logo-transparent.png"
          alt="RLCA"
          width={180}
          height={130}
          className="mx-auto h-24 w-auto"
        />
        <p className="eyebrow mt-5 text-[#1677ff]">Official league account</p>
        <h1 className="mt-3 text-3xl font-black text-[#0b1f3a]">Sign in to RLCA</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Connect Discord to access registration and the league tools authorized for your role.
        </p>
        <form
          className="mt-7"
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-md bg-[#5865f2] px-5 py-3 font-bold text-white hover:bg-[#4752c4]">
            Continue with Discord
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-slate-500">
          RLCA receives your Discord identity and email. Your bot token is never sent to this page.
        </p>
      </div>
    </section>
  );
}

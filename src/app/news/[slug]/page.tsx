import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSiteContent } from "@/services/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const content = await loadSiteContent("CONTENT");
  const article = content.items.find((item) => item.key === slug);
  return { title: article?.title ?? "News" };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = await loadSiteContent("CONTENT");
  if (content.status !== "READY") {
    return (
      <main className="min-h-[70vh] bg-[#f2f5f8] px-5 py-20">
        <div className="panel mx-auto max-w-2xl p-9 text-center">
          <h1 className="text-3xl font-black">Official news is temporarily unavailable</h1>
          <p className="mt-3 text-slate-600">The database could not be read. No fallback article is being shown.</p>
          <a href="" className="mt-6 inline-flex bg-[#168bff] px-5 py-3 font-black text-white">Retry</a>
        </div>
      </main>
    );
  }
  const article = content.items.find((item) => item.key === slug);
  if (!article) notFound();
  const related = content.items.filter((item) => item.id !== article.id).slice(0, 3);

  return (
    <article className="min-h-screen bg-[#f2f5f8]">
      <header className="bg-[#061426] text-white">
        {article.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.mediaUrl} alt="" className="max-h-[32rem] w-full object-cover opacity-70" />
        )}
        <div className="mx-auto max-w-4xl px-5 py-14">
          <p className="eyebrow text-blue-300">Official RLCA news</p>
          <h1 className="display-title mt-4 text-5xl sm:text-7xl">{article.title}</h1>
          <p className="mt-5 text-sm font-bold text-slate-400">
            Updated {new Date(article.updatedAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}
          </p>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1fr_18rem]">
        <div className="whitespace-pre-line text-lg leading-9 text-slate-700">{article.body}</div>
        <aside>
          <p className="eyebrow text-[#168bff]">Related stories</p>
          <div className="mt-4 border-y border-slate-200">
            {related.map((item) => (
              <Link key={item.id} href={`/news/${item.key}`} className="block border-b border-slate-200 py-4 font-black text-[#061426] last:border-0">{item.title}</Link>
            ))}
            {!related.length && <p className="py-4 text-sm text-slate-500">No related stories yet.</p>}
          </div>
        </aside>
      </div>
    </article>
  );
}

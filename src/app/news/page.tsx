import type { Metadata } from "next";
import Link from "next/link";
import { loadSiteContent } from "@/services/site-content";

export const metadata: Metadata = { title: "News" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const content = await loadSiteContent("CONTENT");
  const articles = content.items;
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl"><p className="eyebrow text-blue-300">League updates</p><h1 className="display-title mt-3 text-5xl sm:text-6xl">RLCA news</h1><p className="mt-5 max-w-2xl text-slate-300">Season announcements, roster updates, competition news, and official league information.</p></div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {content.status !== "READY" ? (
          <div className="panel mx-auto max-w-2xl border border-red-200 p-9 text-center">
            <h2 className="text-2xl font-black text-red-950">Official news is temporarily unavailable.</h2>
            <p className="mt-3 text-red-800">The official database could not be read. No fallback or mock announcements are being shown.</p>
          </div>
        ) : articles.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article key={article.id} className="panel overflow-hidden">
                {article.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.mediaUrl} alt="" className="aspect-video w-full object-cover" />
                )}
                <div className="p-7">
                  <p className="eyebrow text-[#168bff]">Official update</p>
                  <h2 className="mt-3 text-2xl font-black text-[#061426]">{article.title}</h2>
                  <p className="mt-4 line-clamp-6 whitespace-pre-line leading-7 text-slate-600">{article.body}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="panel mx-auto max-w-2xl p-9 text-center">
            <h2 className="text-2xl font-black">No news has been published.</h2>
            <p className="mt-3 text-slate-600">Official announcements will appear here when released.</p>
            <Link href="/league" className="mt-6 inline-flex rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Explore the league</Link>
          </div>
        )}
      </main>
    </div>
  );
}

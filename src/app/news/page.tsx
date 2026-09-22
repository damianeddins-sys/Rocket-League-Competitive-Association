import type { Metadata } from "next";
import Link from "next/link";
import { loadSiteContent } from "@/services/site-content";

export const metadata: Metadata = { title: "News" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const content = await loadSiteContent("CONTENT");
  const articles = content.items;
  const [featured, ...recent] = articles;
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="esports-surface px-5 py-16 text-white">
        <div className="mx-auto max-w-7xl"><p className="eyebrow text-blue-300">League updates</p><h1 className="display-title mt-3 text-5xl sm:text-6xl">RLCA news</h1><p className="mt-5 max-w-2xl text-slate-300">Season announcements, roster updates, competition news, and official league information.</p></div>
      </section>
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        {content.status !== "READY" ? (
          <div className="empty-stage border-red-200">
            <h2 className="text-2xl font-black text-red-950">Official news is temporarily unavailable.</h2>
            <p className="mt-3 text-red-800">The official database could not be read. No fallback or mock announcements are being shown.</p>
          </div>
        ) : featured ? (
          <>
            <Link href={`/news/${featured.key}`} className="grid overflow-hidden bg-[#061426] text-white lg:grid-cols-[1.15fr_.85fr]">
              {featured.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.mediaUrl} alt="" className="h-full min-h-72 w-full object-cover" />
              ) : (
                <div className="hero-grid min-h-72" aria-hidden />
              )}
              <div className="flex flex-col justify-center p-8 sm:p-12">
                <p className="eyebrow text-blue-300">Featured story</p>
                <h2 className="display-title mt-4 text-4xl sm:text-5xl">{featured.title}</h2>
                <p className="mt-5 line-clamp-5 whitespace-pre-line leading-7 text-slate-300">{featured.body}</p>
                <span className="mt-7 font-black text-blue-200">Read featured story →</span>
              </div>
            </Link>
            {recent.length > 0 && <div className="mb-6 mt-12 flex items-end justify-between"><div><p className="eyebrow text-[#168bff]">Published by the league</p><h2 className="mt-2 text-3xl font-black text-[#061426]">Recent announcements</h2></div></div>}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((article) => (
              <article key={article.id} className="panel overflow-hidden">
                {article.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.mediaUrl} alt="" className="aspect-video w-full object-cover" />
                )}
                <div className="p-7">
                  <p className="eyebrow text-[#168bff]">Official update</p>
                  <h2 className="mt-3 text-2xl font-black text-[#061426]">{article.title}</h2>
                  <p className="mt-4 line-clamp-6 whitespace-pre-line leading-7 text-slate-600">{article.body}</p>
                  <Link href={`/news/${article.key}`} className="mt-5 inline-flex font-black text-[#0765c9]">Read story →</Link>
                </div>
              </article>
            ))}
            </div>
          </>
        ) : (
          <div className="empty-stage">
            <h2 className="text-2xl font-black">No news has been published.</h2>
            <p className="mt-3 text-slate-600">Official announcements will appear here when released.</p>
            <Link href="/league" className="mt-6 inline-flex rounded-lg bg-[#168bff] px-5 py-3 font-black text-white">Explore the league</Link>
          </div>
        )}
      </main>
    </div>
  );
}

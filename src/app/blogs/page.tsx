import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { BLOGS } from "@/lib/blogs"

export const metadata: Metadata = {
  title: "Sports Blog | Strikora - Turfs, Tournaments & Tips in Pachora",
  description:
    "Read the latest on sports turfs, tournaments, and tips in Pachora and nearby cities (Jalgaon, Bhusawal, Chalisgaon, Dhule, Nashik). Football, cricket, badminton, pickleball and more.",
  alternates: { canonical: "https://strikora.in/blogs" },
}

export default function BlogsPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#171A2B]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white">S</span>
            <span className="text-[23px] font-black tracking-[-0.06em] text-[#171A2B]">strikora<span className="text-orange-500">.</span></span>
          </Link>
          <Link href="/" className="text-sm font-bold text-orange-600 hover:text-orange-700">← Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Strikora Blog</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Sports, Turfs & Tournaments</h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Guides, tips and updates on sports facilities in Pachora and nearby cities — Jalgaon, Bhusawal, Chalisgaon, Dhule and Nashik.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BLOGS.map((post) => (
            <Link key={post.slug} href={`/blogs/${post.slug}`} className="group">
              <article className="h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
                <div className="relative h-48 overflow-hidden bg-slate-200">
                  <Image src={post.image} alt={post.title} fill unoptimized className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-600">{post.category}</span>
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-semibold text-slate-400">{new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {post.readTime}</p>
                  <h2 className="mt-2 text-lg font-black tracking-tight text-[#171A2B] group-hover:text-orange-600 transition-colors">{post.title}</h2>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-3">{post.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-orange-600">Read more <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Strikora. All rights reserved. Book · Play · Compete.
        </div>
      </footer>
    </div>
  )
}
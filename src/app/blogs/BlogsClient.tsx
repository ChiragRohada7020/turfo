"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo, useState } from "react"
import { BLOGS } from "@/lib/blogs"

export default function BlogsClient() {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return BLOGS
    return BLOGS.filter((p) =>
      (p.title + " " + p.description + " " + p.content + " " + p.category).toLowerCase().includes(q)
    )
  }, [query])

  return (
    <>
      <div className="mb-8">
        <input
          type="search"
          placeholder="Search Pachora sports, places, turfs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500"
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => (
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
      {filtered.length === 0 && <p className="text-slate-500">No posts found.</p>}
    </>
  )
}
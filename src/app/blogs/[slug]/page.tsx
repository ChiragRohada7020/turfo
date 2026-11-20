import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BLOGS } from "@/lib/blogs"

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = BLOGS.find((p) => p.slug === params.slug)
  if (!post) return {}
  return {
    title: `${post.title} | Strikora Blog`,
    description: post.description,
    alternates: { canonical: `https://strikora.in/blogs/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.image }],
    },
  }
}

export default function BlogDetailPage({ params }: { params: { slug: string } }) {
  const post = BLOGS.find((p) => p.slug === params.slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#171A2B]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white">S</span>
            <span className="text-[23px] font-black tracking-[-0.06em] text-[#171A2B]">strikora<span className="text-orange-500">.</span></span>
          </Link>
          <Link href="/blogs" className="text-sm font-bold text-orange-600 hover:text-orange-700">← All Blogs</Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
          <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-600 font-bold">{post.category}</span>
          <span>{new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>· {post.readTime}</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{post.title}</h1>
        <p className="mt-4 text-lg text-slate-500">{post.description}</p>

        <div className="relative mt-8 h-64 overflow-hidden rounded-3xl sm:h-80">
          <Image src={post.image} alt={post.title} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 768px" />
        </div>

        <div className="mt-8 prose prose-slate max-w-none">
          {post.content.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return <h2 key={i} className="mt-8 mb-3 text-2xl font-black tracking-tight text-[#171A2B]">{line.replace("## ", "")}</h2>
            }
            if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ") || line.startsWith("5. ")) {
              return <li key={i} className="ml-6 text-slate-600 leading-7">{line.replace(/^\d\. /, "")}</li>
            }
            if (line.trim() === "") return <br key={i} />
            return <p key={i} className="text-slate-600 leading-7">{line}</p>
          })}
        </div>

        <div className="mt-12 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-center text-white">
          <h3 className="text-2xl font-black">Ready to play?</h3>
          <p className="mt-2 text-white/80">Book your next game on Strikora.</p>
          <Link href="/search" className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-extrabold text-orange-600 shadow-xl transition hover:-translate-y-1">
            Find a turf <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </article>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Strikora. All rights reserved. Book · Play · Compete.
        </div>
      </footer>
    </div>
  )
}
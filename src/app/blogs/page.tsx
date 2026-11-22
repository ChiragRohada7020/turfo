import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import BlogsClient from "./BlogsClient"

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

        <BlogsClient />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Strikora. All rights reserved. Book · Play · Compete.
        </div>
      </footer>
    </div>
  )
}
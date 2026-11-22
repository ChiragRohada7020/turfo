"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopNavbar } from "@/modules/shared/components/layout/TopNavbar"
import { LifeBuoy, Mail, Phone, MessageSquare } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function SupportPage() {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      // Simulate submission
      await new Promise((r) => setTimeout(r, 800))
      toast({ title: "Submitted", description: "Our support team will contact you soon." })
      setSubject("")
      setMessage("")
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <div className="min-h-screen md:pl-[262px]">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="mx-auto max-w-3xl p-4 sm:p-6 xl:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-slate-400">We're here to help you.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card className="bg-[#131C2E] border-white/10">
            <CardContent className="p-4 text-center">
              <Mail className="mx-auto mb-2 h-6 w-6 text-orange-400" />
              <p className="text-sm font-bold">Email</p>
              <p className="text-xs text-slate-400">info@strikora.in</p>
            </CardContent>
          </Card>
          <Card className="bg-[#131C2E] border-white/10">
            <CardContent className="p-4 text-center">
              <Phone className="mx-auto mb-2 h-6 w-6 text-orange-400" />
              <p className="text-sm font-bold">Phone</p>
              <p className="text-xs text-slate-400">+91 70208 80419</p>
            </CardContent>
          </Card>
          <Card className="bg-[#131C2E] border-white/10">
            <CardContent className="p-4 text-center">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 text-orange-400" />
              <p className="text-sm font-bold">Chat</p>
              <p className="text-xs text-slate-400">Available 9-6</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#131C2E] border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-orange-400" /> Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-[#182238] border-white/10 text-white"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <Label className="text-slate-300">Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-[#182238] border-white/10 text-white min-h-[120px]"
                  placeholder="Describe your issue..."
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-orange-400 font-bold text-black hover:bg-orange-300">
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!session && (
          <p className="mt-4 text-center text-sm text-slate-400">
            <Link href="/auth/login" className="text-orange-400 hover:underline">Sign in</Link> for faster support.
          </p>
        )}
      </div>
      </div>
    </div>
  )
}

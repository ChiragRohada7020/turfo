"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, MapPin, Save, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"
import { Sidebar } from "@/modules/shared/components/layout/Sidebar"
import { TopNavbar } from "@/modules/shared/components/layout/TopNavbar"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isOwner = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN"

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    latitude: "",
    longitude: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const { data: profile } = trpc.auth.getProfile.useQuery()

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        postalCode: profile.postalCode || "",
        latitude: profile.latitude?.toString() || "",
        longitude: profile.longitude?.toString() || "",
      })
    }
  }, [profile])

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast({ title: "Saved", description: "Profile updated successfully" })
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast({ title: "Success", description: "Password changed successfully" })
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await updateProfile.mutateAsync({
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
    } catch (e: any) {
      // Error handled by onError
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 text-white">
        <div className="max-w-md w-full bg-[#111a22] border border-white/10 rounded-2xl p-8 text-center">
          <User className="w-12 h-12 text-lime-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <Link href="/auth/login" className="mt-6 w-full">
            <Button className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070d12] text-white">
      <Sidebar session={session} mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <div className="md:pl-[262px]">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-slate-400">Manage your profile and location</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-[#111a22] border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-lime-400" /> Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Phone</Label>
                  <Input value={form.phone} disabled className="bg-[#121b24] border-white/10 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111a22] border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-lime-400" /> Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Email</Label>
                  <Input value={profile?.email || ""} disabled className="bg-[#121b24] border-white/10 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Phone</Label>
                  <Input value={form.phone} disabled className="bg-[#121b24] border-white/10 text-slate-400" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Role</Label>
                  <Input value={session?.user?.role || ""} disabled className="bg-[#121b24] border-white/10 text-slate-400" />
                </div>
                {session?.user?.role === "PLAYER" && (
                  <div className="p-3 bg-[#17222d] rounded-lg border border-white/[0.08]">
                    <p className="text-xs text-slate-400">CIBIL Score</p>
                    <p className="text-lg font-bold text-lime-400">{profile?.cibilScore || 750}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Join games and complete bookings to improve your score</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#111a22] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-lime-400" /> Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Address</Label>
                    <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">City</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">State</Label>
                      <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Postal Code</Label>
                      <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Latitude</Label>
                      <Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Longitude</Label>
                      <Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">This location will be used as default for new facilities you create.</p>
                </CardContent>
              </Card>
            <Card className="bg-[#111a22] border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-lime-400" /> Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Current Password</Label>
                  <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">New Password</Label>
                  <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Confirm Password</Label>
                  <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="bg-[#121b24] border-white/10 text-white" />
                </div>
                <Button type="button" onClick={handlePasswordChange} className="w-full bg-white/10 text-white hover:bg-white/20" disabled={isLoading}>
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
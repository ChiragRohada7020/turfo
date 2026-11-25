"use client"

import { useState, useEffect } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Phone, ShieldCheck } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"

const INDIAN_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"]

export default function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [step, setStep] = useState<"phone" | "otp" | "register">("phone")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("PLAYER")
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  const [reg, setReg] = useState({ name: "", state: "", city: "", referralCode: "" })
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [cityLoading, setCityLoading] = useState(false)

  const sendOTP = trpc.auth.sendLoginOTP.useMutation({
    onSuccess: () => {
      toast({ title: "OTP Sent", description: "Check your phone for the OTP" })
      setStep("otp")
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: "Error", description: "Enter a valid phone number", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      await sendOTP.mutateAsync({ phone })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setIsLoading(true)
    try {
      const result = await signIn("phone", { phone, otp, role, redirect: false })
      if (result?.error === "NEW_USER") {
        setIsNewUser(true)
        setStep("register")
        return
      }
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }
      let target = callbackUrl
      if (role === "SPONSOR") target = "/dashboard/sponsor"
      else if (role === "OWNER") target = "/dashboard"
      else if (role === "ADMIN") target = "/admin"
      window.location.href = target
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Verification failed", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!reg.name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const result = await signIn("phone", {
        phone,
        otp,
        name: reg.name,
        role,
        state: reg.state,
        city: reg.city,
        referralCode: reg.referralCode,
        redirect: false,
      })
      if (result?.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" })
        return
      }
      let target = callbackUrl
      if (role === "SPONSOR") target = "/dashboard/sponsor"
      else if (role === "OWNER") target = "/dashboard"
      else if (role === "ADMIN") target = "/admin"
      window.location.href = target
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Registration failed", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!reg.state) { setCityOptions([]); return }
    setCityLoading(true)
    fetch(`https://countriesnow.space/api/v0.1/countries/state/cities/q?country=India&state=${encodeURIComponent(reg.state)}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.data) ? d.data : []
        setCityOptions(list.map((c: string) => (c || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
      })
      .catch(() => setCityOptions([]))
      .finally(() => setCityLoading(false))
  }, [reg.state])

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#171A2B] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white shadow-lg">S</span>
            <span className="text-2xl font-black tracking-[-0.06em] text-[#171A2B]">strikora<span className="text-orange-500">.</span></span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Book · Play · Compete</p>
        </div>

        <Card className="bg-white border border-slate-200 rounded-3xl shadow-xl">
          <CardContent className="p-6 sm:p-8">
            {step === "phone" && (
              <>
                <h1 className="text-2xl font-black tracking-tight mb-6 text-black">Sign In</h1>
                <div className="space-y-2 mb-4">
                  <Label className="text-slate-700 font-semibold">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLAYER">Player</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                      <SelectItem value="SPONSOR">Sponsor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="phone" className="text-slate-700 font-semibold">Mobile Number</Label>
                  <Input id="phone" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white border-slate-200 text-slate-900" />
                </div>
                <Button className="w-full h-12 bg-orange-500 font-bold text-white" onClick={handleSendOtp} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send OTP
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <h1 className="text-2xl font-black tracking-tight mb-6 text-black">Verify OTP</h1>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="otp" className="text-slate-700 font-semibold">OTP Code</Label>
                  <Input id="otp" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-center text-2xl tracking-widest" />
                </div>
                <Button className="w-full h-12 bg-orange-500 font-bold text-white" onClick={handleVerifyOtp} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Verify
                </Button>
              </>
            )}

            {step === "register" && (
              <>
                <h1 className="text-2xl font-black tracking-tight mb-6">Complete Profile</h1>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Name</Label>
                    <Input value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} className="bg-white border-slate-200 text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">State</Label>
                    <Select value={reg.state} onValueChange={(v) => { setReg({ ...reg, state: v, city: "" }); setCityOptions([]) }}>
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">City</Label>
                    <Input
                      list="login-city-options"
                      value={reg.city}
                      onChange={(e) => setReg({ ...reg, city: e.target.value })}
                      placeholder="Type or select city"
                      className="bg-white border-slate-200 text-slate-900"
                    />
                    <datalist id="login-city-options">
                      {cityOptions.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">Referral Code (optional)</Label>
                    <Input value={reg.referralCode} onChange={(e) => setReg({ ...reg, referralCode: e.target.value })} className="bg-white border-slate-200 text-slate-900" />
                  </div>
                </div>
                <Button className="w-full h-12 bg-orange-500 font-bold text-white mt-4" onClick={handleRegister} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create Account
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

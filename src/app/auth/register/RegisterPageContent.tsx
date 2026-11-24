"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ShieldCheck, Trophy, Zap, Gift } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  phone: z.string().min(10, "Phone number is required"),
  role: z.enum(["PLAYER", "OWNER", "SPONSOR"]).default("PLAYER"),
  state: z.string().optional(),
  city: z.string().optional(),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get("role") as "PLAYER" | "OWNER" | "SPONSOR") || "PLAYER"
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"details" | "otp">("details")
  const [otp, setOtp] = useState("")
  const [formData, setFormData] = useState<RegisterForm | null>(null)
  const [verifiedPhone, setVerifiedPhone] = useState("")
  const [selectedState, setSelectedState] = useState("")
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [detectedCity, setDetectedCity] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: defaultRole,
      state: "",
      city: "",
      referralCode: searchParams.get("ref") || "",
    },
  })

  const password = watch("password")

  useEffect(() => {
    if (!selectedState) { setCityOptions([]); setValue("city", ""); return }
    setValue("state", selectedState)
    setCityLoading(true)
    fetch(`https://countriesnow.space/api/v0.1/countries/state/cities/q?country=India&state=${encodeURIComponent(selectedState)}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.data) ? d.data : []
        setCityOptions(list.map((c: string) => (c || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
      })
      .catch(() => setCityOptions([]))
      .finally(() => setCityLoading(false))
  }, [selectedState])

  useEffect(() => {
    if (selectedState || typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1&accept-language=en`)
        const data = await res.json()
        const addr = data?.address || {}
        const stateName = addr.state
        const rawCity = addr.city || addr.town || addr.village || addr.state_district || addr.county
        const cityName = rawCity ? rawCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : rawCity
        const states = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"]
        if (stateName && states.includes(stateName)) {
          setSelectedState(stateName)
          if (cityName) setDetectedCity(cityName)
        }
      } catch {}
    }, () => {})
  }, [])

  useEffect(() => {
    if (!detectedCity) return
    if (cityOptions.includes(detectedCity)) {
      setValue("city", detectedCity)
    } else if (cityOptions.length > 0) {
      setCityOptions((prev) => (prev.includes(detectedCity) ? prev : [detectedCity, ...prev]))
      setValue("city", detectedCity)
    }
  }, [cityOptions, detectedCity])

  const sendOTP = trpc.auth.sendRegistrationOTP.useMutation({
    onSuccess: () => {
      toast({ title: "OTP Sent", description: "Please check your phone for the OTP" })
      setStep("otp")
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  const verifyOTP = trpc.auth.verifyRegistrationOTP.useMutation({
    onSuccess: (data) => {
      setVerifiedPhone(data.phone)
      createAccount(formData!)
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message || "Invalid OTP", variant: "destructive" })
    },
  })

  const createAccount = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: verifiedPhone || data.phone,
          role: data.role,
          city: data.city,
          state: data.state,
           phoneVerified: true,
           referralCode: data.referralCode || searchParams.get("ref") || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({ title: "Error", description: result.error || "Registration failed", variant: "destructive" })
        return
      }

      toast({ title: "Success", description: "Account created! Please sign in.", variant: "success" })
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: RegisterForm) => {
    if (step === "details") {
      setFormData(data)
      setIsLoading(true)
      try {
        await sendOTP.mutateAsync({ phone: data.phone, email: data.email, role: data.role as any })
      } finally {
        setIsLoading(false)
      }
    } else {
      setIsLoading(true)
      try {
        await verifyOTP.mutateAsync({ phone: formData?.phone || "", otp })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getPasswordStrength = (pwd?: string | null) => {
    if (!pwd) return 0
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)

  if (step === "otp") {
    return (
      <div className="min-h-screen bg-[#F7F8FC] text-[#171A2B] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white shadow-lg">
                S
              </span>
              <span className="text-2xl font-black tracking-[-0.06em] text-[#171A2B]">
                strikora<span className="text-orange-500">.</span>
              </span>
            </Link>
            <p className="text-slate-500 mt-2 text-sm">Book · Play · Compete</p>
          </div>

          <Card className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <ShieldCheck className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h1 className="text-2xl font-black tracking-tight">Verify Phone Number</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Enter the OTP sent to {formData?.phone} via WhatsApp
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-slate-700 font-semibold">OTP Code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="bg-white border-slate-200 text-slate-900 text-center text-2xl tracking-widest focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <Button
                  className="w-full h-12 bg-orange-500 font-bold text-white hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/20"
                  onClick={() => onSubmit(formData!)}
                  disabled={isLoading || otp.length < 4}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Create Account"
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setStep("details")
                    setOtp("")
                  }}
                  disabled={isLoading}
                >
                  Back to Details
                </Button>

                <p className="text-xs text-slate-400 text-center">
                  Didn't receive OTP?{" "}
                  <button
                    onClick={() => sendOTP.mutate({ phone: formData?.phone || "", email: formData?.email, role: formData?.role as any })}
                    className="text-orange-600 hover:underline font-medium"
                    disabled={sendOTP.isPending}
                  >
                    Resend
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-orange-500" /> Instant booking</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-orange-500" /> Secure signup</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-orange-500" /> Tournaments</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-[#171A2B] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white shadow-lg">
              S
            </span>
            <span className="text-2xl font-black tracking-[-0.06em] text-[#171A2B]">
              strikora<span className="text-orange-500">.</span>
            </span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Book · Play · Compete</p>
        </div>

        <Card className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-black text-center mb-2 tracking-tight text-black">Create Account</h1>
            <p className="text-slate-500 text-center text-sm mb-6">Join Strikora today</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-slate-700 font-semibold">State</Label>
                <Select onValueChange={(v) => { setSelectedState(v); setValue("state", v); setValue("city", "") }} value={selectedState}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-slate-700 font-semibold">City</Label>
                <Input
                  id="city"
                  list="city-options"
                  placeholder={cityLoading ? "Loading cities..." : "Type or select city"}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                  value={watch("city") || ""}
                  onChange={(e) => setValue("city", e.target.value)}
                  disabled={!selectedState || cityLoading}
                />
                <datalist id="city-options">
                  {cityOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                {password && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full",
                          i <= passwordStrength ? "bg-orange-500" : "bg-slate-200"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                    {...register("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-700 font-semibold">I want to</Label>
                <Select onValueChange={(value) => setValue("role", value as "PLAYER" | "OWNER" | "SPONSOR")} defaultValue={defaultRole}>
                  <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="PLAYER">Book facilities as a Player</SelectItem>
                    <SelectItem value="OWNER">List my facility as an Owner</SelectItem>
                    <SelectItem value="SPONSOR">Promote my brand as a Sponsor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-slate-700 font-semibold">Referral Code (Optional)</Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="referralCode"
                    placeholder="Enter referral code"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500"
                    {...register("referralCode")}
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 bg-orange-500 font-bold text-white hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/20"
                disabled={isLoading || sendOTP.isPending}
              >
                {isLoading || sendOTP.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP & Register"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-orange-600 hover:underline font-bold">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-orange-500" /> Instant booking</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-orange-500" /> Secure signup</span>
          <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-orange-500" /> Tournaments</span>
        </div>
      </div>
    </div>
  )
}
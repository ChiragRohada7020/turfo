"use client"

import { useState } from "react"
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
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
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
    },
  })

  const password = watch("password")

  const sendOTP = trpc.auth.sendRegistrationOTP.useMutation({
    onSuccess: (data) => {
      if (data.otp) {
        toast({ title: "OTP (Dev Mode)", description: `Your OTP is: ${data.otp}` })
      } else {
        toast({ title: "OTP Sent", description: "Please check your phone for the OTP" })
      }
      setStep("otp")
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    },
  })

  const verifyOTP = trpc.auth.verifyRegistrationOTP.useMutation({
    onSuccess: (data) => {
      setVerifiedPhone(data.phone)
      // Now create the account
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
          phoneVerified: true,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({ title: "Error", description: result.error || "Registration failed", variant: "destructive" })
        return
      }

      toast({ title: "Success", description: "Account created! Please sign in." })
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
        await sendOTP.mutateAsync({ phone: data.phone })
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
      <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 py-12">
        <Card className="w-full max-w-md bg-[#111a22] border-white/10">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <ShieldCheck className="w-12 h-12 text-lime-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold">Verify Phone Number</h1>
              <p className="mt-2 text-sm text-slate-400">
                Enter the OTP sent to {formData?.phone}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-300">OTP Code</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="bg-[#121b24] border-white/10 text-white text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300"
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
                className="w-full border-white/10 text-white hover:bg-white/5"
                onClick={() => {
                  setStep("details")
                  setOtp("")
                }}
                disabled={isLoading}
              >
                Back to Details
              </Button>

              <p className="text-xs text-slate-500 text-center">
                Didn't receive OTP?{" "}
                <button
                  onClick={() => sendOTP.mutate({ phone: formData?.phone || "" })}
                  className="text-lime-400 hover:underline"
                  disabled={sendOTP.isPending}
                >
                  Resend
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070d12] px-4 py-12">
      <Card className="w-full max-w-md bg-[#111a22] border-white/10">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="mt-2 text-sm text-slate-400">Join TurfPlay today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="pl-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500"
                  {...register("name")}
                />
              </div>
              {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  className="pl-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500"
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p className="text-sm text-red-400">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
              {password && (
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        i <= passwordStrength ? "bg-lime-400" : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500"
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-300">I want to</Label>
              <Select onValueChange={(value) => setValue("role", value as "PLAYER" | "OWNER" | "SPONSOR")} defaultValue={defaultRole}>
                <SelectTrigger className="w-full bg-[#121b24] border-white/10 text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#111a22] border-white/10 text-white">
                  <SelectItem value="PLAYER">Book facilities as a Player</SelectItem>
                  <SelectItem value="OWNER">List my facility as an Owner</SelectItem>
                  <SelectItem value="SPONSOR">Promote my brand as a Sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300"
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

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-lime-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
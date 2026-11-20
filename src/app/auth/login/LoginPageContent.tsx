"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Lock, Eye, EyeOff, Loader2, Trophy, Zap, ShieldCheck } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().min(3, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setVerificationError(null)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: callbackUrl,
      })

      if (result?.error) {
        setVerificationError(result.error)
        toast({ title: "Error", description: result.error, variant: "destructive" })
      } else {
        toast({ title: "Success", description: "Welcome back!", variant: "success" })
        window.location.href = result?.url || callbackUrl
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong"
      setVerificationError(msg)
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
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
              strikora<span className="text-green-500">.</span>
            </span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Book · Play · Compete</p>
        </div>

        <Card className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-black text-center mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 text-center text-sm mb-6">Sign in to your account to continue</p>

            {verificationError && (
              <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{verificationError}</p>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="you@example.com"
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-green-500"
                    {...register("email")}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-green-500"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500">
                  <input type="checkbox" className="rounded border-slate-300 text-green-500 focus:ring-green-500" />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-green-600 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full h-12 bg-green-500 font-bold text-white hover:bg-green-600 rounded-xl shadow-lg shadow-green-500/20" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{" "}
                <Link href="/auth/register" className="text-green-600 hover:underline font-bold">
                  Sign up
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
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-green-500" /> Instant booking</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Secure login</span>
          <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-green-500" /> Tournaments</span>
        </div>
      </div>
    </div>
  )
}
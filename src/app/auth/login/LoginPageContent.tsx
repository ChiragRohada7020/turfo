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
import { Mail, Lock, Eye, EyeOff, Loader2, Trophy } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
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
        toast({ title: "Success", description: "Welcome back!" })
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
    <div className="min-h-screen bg-[#070d12] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-lime-400 text-lime-400">
              <span className="text-xl">🏟️</span>
            </div>
            <span className="text-2xl font-black tracking-tight">Turf<span className="text-lime-400">Play</span></span>
          </Link>
          <p className="text-slate-400 mt-2 text-sm">Book · Play · Compete</p>
        </div>

        <Card className="bg-[#111a22] border-white/10 rounded-2xl">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-center mb-2">Welcome Back</h1>
            <p className="text-slate-400 text-center text-sm mb-6">Sign in to your account to continue</p>

            {verificationError && (
              <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-200">{verificationError}</p>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("email")}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-[#121b24] border-white/10 text-white placeholder:text-slate-500 focus:border-lime-400/50"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400">
                  <input type="checkbox" className="rounded border-white/10 bg-[#121b24]" />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-lime-400 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full bg-lime-400 font-bold text-black hover:bg-lime-300" disabled={isLoading}>
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
              <p className="text-sm text-slate-400">
                Don't have an account?{" "}
                <Link href="/auth/register" className="text-lime-400 hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-slate-300">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-slate-300">Privacy Policy</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Credentials */}
        <div className="mt-4 p-4 rounded-xl bg-[#111a22] border border-white/10">
          <p className="text-xs text-slate-400 text-center mb-2">Test Credentials:</p>
          <div className="text-xs text-slate-500 text-center space-y-1">
            <p>Player: player@erp.rohadas.in / Test@123456</p>
            <p>Owner: owner@erp.rohadas.in / Test@123456</p>
            <p>Admin: admin@erp.rohadas.in / Test@123456</p>
          </div>
        </div>
      </div>
    </div>
  )
}

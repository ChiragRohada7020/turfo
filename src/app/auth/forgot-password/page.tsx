"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Loader2, Zap, ShieldCheck, Trophy } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({ title: "Error", description: result.error || "Request failed", variant: "destructive" })
        return
      }

      toast({ title: "Success", description: "OTP sent to your email", variant: "success" })
      router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}`)
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
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
              strikora<span className="text-orange-500">.</span>
            </span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Book · Play · Compete</p>
        </div>

        <Card className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-black text-center mb-2 tracking-tight">Forgot Password</h1>
            <p className="text-slate-500 text-center text-sm mb-6">Enter your email to reset your password</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 bg-orange-500 font-bold text-white hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/20" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Remember your password?{" "}
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
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-orange-500" /> Secure account</span>
          <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-orange-500" /> Tournaments</span>
        </div>
      </div>
    </div>
  )
}
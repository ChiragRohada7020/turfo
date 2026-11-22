"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Loader2, KeyRound } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().min(6, "Enter 6-digit OTP"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type Form = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: params.get("email") || "", otp: "", password: "" },
  })

  const onSubmit = async (data: Form) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: result.error || "Reset failed", variant: "destructive" })
        return
      }
      toast({ title: "Success", description: "Password reset successful", variant: "success" })
      router.push("/auth/login")
    } catch {
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
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171A2B] text-lg font-black text-white shadow-lg">S</span>
            <span className="text-2xl font-black tracking-[-0.06em] text-[#171A2B]">strikora<span className="text-orange-500">.</span></span>
          </Link>
        </div>
        <Card className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-2xl font-black text-center mb-2 tracking-tight">Reset Password</h1>
            <p className="text-slate-500 text-center text-sm mb-6">Enter OTP sent to your email and new password</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                <Input id="email" type="email" className="bg-white border-slate-200 text-slate-900" {...register("email")} disabled={isLoading} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-700 font-semibold">OTP</Label>
                <Input id="otp" type="text" placeholder="123456" className="bg-white border-slate-200 text-slate-900" {...register("otp")} disabled={isLoading} />
                {errors.otp && <p className="text-sm text-red-500">{errors.otp.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-semibold">New Password</Label>
                <Input id="password" type="password" className="bg-white border-slate-200 text-slate-900" {...register("password")} disabled={isLoading} />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-12 bg-orange-500 font-bold text-white hover:bg-orange-600 rounded-xl" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : "Reset Password"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-orange-600 hover:underline font-bold text-sm">Back to Sign In</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        const Icon = variant === "destructive" ? XCircle : variant === "success" ? CheckCircle2 : variant === "warning" ? AlertTriangle : Info
        const iconColor = variant === "destructive" ? "text-red-600" : variant === "success" ? "text-green-600" : variant === "warning" ? "text-amber-600" : "text-blue-600"
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
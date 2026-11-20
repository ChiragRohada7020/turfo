import { Cashfree, CFEnvironment } from "cashfree-pg"

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || ""
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || ""
const CASHFREE_ENV = (process.env.CASHFREE_ENV || "SANDBOX") as "SANDBOX" | "PRODUCTION"

if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
  console.warn("[Cashfree] Credentials not configured. Payment features will be disabled.")
}

export const cashfreeClient = new Cashfree(
  CASHFREE_ENV === "PRODUCTION" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
  CASHFREE_APP_ID,
  CASHFREE_SECRET_KEY
)

export function generateOrderId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export async function createCashfreeOrder(params: {
  orderId: string
  orderAmount: number
  orderCurrency: string
  customerId: string
  customerName?: string
  customerEmail?: string
  customerPhone: string
  orderExpiryTime?: string
  orderNote?: string
  orderTags?: Record<string, string>
}): Promise<{
  cfOrderId: string
  paymentLink: string
  orderToken?: string
  paymentSessionId?: string
}> {
  const response = await cashfreeClient.PGCreateOrder({
    order_id: params.orderId,
    order_amount: params.orderAmount,
    order_currency: params.orderCurrency,
    customer_details: {
      customer_id: params.customerId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    order_expiry_time: params.orderExpiryTime,
    order_note: params.orderNote,
    order_tags: params.orderTags,
  })

  const data = response.data as any

  if (!data.cf_order_id) {
    throw new Error("Failed to create Cashfree order: " + JSON.stringify(data))
  }

  let paymentLink = ""
  let paymentSessionId = ""

  if (data.payment_session_id) {
    paymentSessionId = data.payment_session_id
    paymentLink = `${CASHFREE_ENV === "PRODUCTION" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com"}/pg/orders/${params.orderId}/checkout?payment_session_id=${data.payment_session_id}`
  } else if (data.payment_link) {
    paymentLink = data.payment_link
  } else {
    paymentLink = `${CASHFREE_ENV === "PRODUCTION" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com"}/pg/orders/${params.orderId}/checkout`
  }

  return {
    cfOrderId: data.cf_order_id,
    paymentLink,
    orderToken: data.order_token,
    paymentSessionId,
  }
}

export async function createCashfreeRefund(params: {
  orderId: string
  refundAmount: number
  refundId: string
  refundNote?: string
}): Promise<{
  cfRefundId: string
  refundStatus: string
}> {
  try {
    const response = await cashfreeClient.PGOrderCreateRefund(
      params.orderId,
      {
        refund_amount: params.refundAmount,
        refund_id: params.refundId,
        refund_note: params.refundNote || "Cancellation refund",
      }
    )

    const data = response.data as any

    return {
      cfRefundId: data.cf_refund_id || data.refund_id || params.refundId,
      refundStatus: data.refund_status || "PENDING",
    }
  } catch (error: any) {
    console.error("[Cashfree Refund] Error:", error.response?.data || error.message)
    throw new Error(error.response?.data?.message || "Refund failed")
  }
}
export async function initiateCashfreePayout(params: {
  transferId: string
  amount: number
  beneficiaryId: string
  remarks?: string
}): Promise<{
  cfTransferId: string
  status: string
  utr?: string
}> {
  try {
    // Cashfree Payouts API
    const url = CASHFREE_ENV === "PRODUCTION"
      ? "https://payout-api.cashfree.com/payout/v1/requestTransfer"
      : "https://payout-gamma.cashfree.com/payout/v1/requestTransfer"

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": CASHFREE_APP_ID,
        "X-Client-Secret": CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify({
        transferId: params.transferId,
        amount: params.amount,
        transferMode: "banktransfer",
        beneficiaryDetails: {
          beneficiaryId: params.beneficiaryId,
        },
        remarks: params.remarks || "Strikora payout",
      }),
    })

    const data = await response.json()

    if (data.status !== "SUCCESS") {
      throw new Error(data.message || "Payout failed")
    }

    return {
      cfTransferId: data.data?.referenceId || data.data?.transferId || params.transferId,
      status: data.data?.status || "PENDING",
      utr: data.data?.utr,
    }
  } catch (error: any) {
    console.error("[Cashfree Payout] Error:", error.message)
    throw new Error(error.message || "Payout failed")
  }
}

export async function createCashfreeContact(params: {
  contactId: string
  name: string
  email: string
  phone: string
  bankAccount: string
  ifsc: string
  accountHolderName: string
}): Promise<{ beneficiaryId: string }> {
  try {
    const url = CASHFREE_ENV === "PRODUCTION"
      ? "https://payout-api.cashfree.com/payout/v1/addBeneficiary"
      : "https://payout-gamma.cashfree.com/payout/v1/addBeneficiary"

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": CASHFREE_APP_ID,
        "X-Client-Secret": CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify({
        beneficiaryId: params.contactId,
        beneficiaryName: params.accountHolderName,
        beneficiaryInstrumentDetails: {
          bankAccountNumber: params.bankAccount,
          bankIfsc: params.ifsc,
        },
        beneficiaryContactDetails: {
          beneficiaryEmail: params.email,
          beneficiaryPhone: params.phone,
        },
        beneficiaryType: "individual",
      }),
    })

    const data = await response.json()

    if (data.status !== "SUCCESS") {
      console.warn("[Cashfree Contact] Warning:", data.message)
    }

    return { beneficiaryId: params.contactId }
  } catch (error: any) {
    console.error("[Cashfree Contact] Error:", error.message)
    throw new Error(error.message || "Failed to create beneficiary")
  }
}
export async function fetchCashfreeOrder(orderId: string) {
  const url = CASHFREE_ENV === "PRODUCTION"
    ? "https://api.cashfree.com/pg/orders/" + orderId
    : "https://sandbox.cashfree.com/pg/orders/" + orderId

  const response = await fetch(url, {
    headers: {
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01",
    },
  })

  if (!response.ok) {
    throw new Error(`Cashfree fetch failed: ${response.status}`)
  }

  return response.json()
}

import crypto from "crypto"

export function verifyCashfreeWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string,
  timestamp?: string
): boolean {
  try {
    const ts = timestamp || ""
    const data = ts + body
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(data)
      .digest("base64")
    return signature === expectedSignature
  } catch {
    return false
  }
}
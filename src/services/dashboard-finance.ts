import { supabase } from '@/lib/supabase/client'
import type { PaymentDetails, PaymentMethod } from '@/services/finance-requests'

export interface DashboardFinancePaymentResponse {
  success: boolean
  alreadyExists: boolean
  paymentId: string
  projectCode: string
  amount: number
  message?: string
}

export async function createDashboardFinancePayment(params: {
  demandId: string
  demandItemId: string
  projectCode: string | null
  projectName?: string | null
  demandTitle?: string | null
  dueDate: string
  paymentMethod: PaymentMethod
  paymentDetails: PaymentDetails
  justification?: string | null
  isUrgent: boolean
  boletoFileName?: string | null
  boletoStoragePath?: string | null
  financeRequestId?: string | null
}): Promise<DashboardFinancePaymentResponse> {
  const { data, error } = await supabase.functions.invoke('dashboard-finance', {
    body: {
      demandId: params.demandId,
      demandItemId: params.demandItemId,
      projectCode: params.projectCode,
      projectName: params.projectName || null,
      demandTitle: params.demandTitle || null,
      dueDate: params.dueDate,
      paymentMethod: params.paymentMethod,
      paymentDetails: params.paymentDetails,
      justification: params.justification || null,
      isUrgent: params.isUrgent,
      boletoFileName: params.boletoFileName || null,
      boletoStoragePath: params.boletoStoragePath || null,
      financeRequestId: params.financeRequestId || null,
    },
  })

  if (error) {
    let message = error.message || 'Não foi possível enviar o item ao Dashboard Financeiro.'
    const context = (error as any).context
    if (context && typeof context.json === 'function') {
      try {
        const errorPayload = await context.json()
        message = errorPayload?.message || message
      } catch {
        // Keep the SDK error message when the response is not JSON.
      }
    }
    throw new Error(message)
  }
  if (!data || data.success === false) {
    throw new Error(data?.message || 'Não foi possível enviar o item ao Dashboard Financeiro.')
  }
  return data as DashboardFinancePaymentResponse
}

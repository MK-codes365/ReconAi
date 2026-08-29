export interface CreateOrderParams {
  amountMinorUnit: bigint;
  receipt: string;
  notes?: Record<string, any>;
  currency?: string;
}

export interface CreatePaymentLinkParams {
  amountMinorUnit: bigint;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  referenceId: string;
  notes?: Record<string, any>;
  currency?: string;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id?: string;
  invoice_id?: string;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status?: string;
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  error_reason?: string;
  error_source?: string;
  error_step?: string;
  created_at: number;
}

export interface RazorpayPaymentLinkResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  short_url: string;
  reference_id: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  created_at: number;
}

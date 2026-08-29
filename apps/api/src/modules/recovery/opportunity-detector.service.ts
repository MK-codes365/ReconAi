import { CaseType } from '@prisma/client';

export interface OpportunityDetectionResult {
  isOpportunity: boolean;
  isResolution: boolean;
  caseType?: CaseType;
  amountMinorUnit?: bigint;
  failureReason?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  customerEmail?: string;
  customerName?: string;
}

export class RecoveryOpportunityDetector {
  public static detect(payload: any): OpportunityDetectionResult {
    const eventType = payload.event || payload.eventType || '';
    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
    const amountMinorUnit = BigInt(paymentEntity.amount || payload.amount || 500000);
    const failureReason = paymentEntity.error_description || paymentEntity.error_reason || payload.failureReason || 'gateway_error';
    const providerPaymentId = paymentEntity.id || payload.paymentId;
    const providerOrderId = paymentEntity.order_id || payload.orderId;
    const customerEmail = paymentEntity.email || payload.customerEmail;
    const customerName = paymentEntity.notes?.customer_name || payload.customerName;

    if (eventType === 'payment.failed') {
      return {
        isOpportunity: true,
        isResolution: false,
        caseType: CaseType.FAILED_PAYMENT,
        amountMinorUnit,
        failureReason,
        providerPaymentId,
        providerOrderId,
        customerEmail,
        customerName,
      };
    } else if (eventType === 'checkout.abandoned') {
      return {
        isOpportunity: true,
        isResolution: false,
        caseType: CaseType.CHECKOUT_ABANDONMENT,
        amountMinorUnit,
        failureReason: 'checkout_abandoned',
        providerPaymentId,
        providerOrderId,
        customerEmail,
        customerName,
      };
    } else if (eventType === 'payment.captured' || eventType === 'order.paid') {
      return {
        isOpportunity: false,
        isResolution: true,
        amountMinorUnit,
        providerPaymentId,
        providerOrderId,
      };
    }

    return {
      isOpportunity: false,
      isResolution: false,
    };
  }
}

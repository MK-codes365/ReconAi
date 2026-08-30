import { razorpayIntegrationService } from '../../integrations/razorpay/razorpay.service';

export class PaymentLinkExecutor {
  public static async execute(params: {
    amountMinorUnit: bigint;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    referenceId: string;
  }) {
    const result = await razorpayIntegrationService.createPaymentLink({
      amountMinorUnit: params.amountMinorUnit,
      description: params.description,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone || undefined,
      referenceId: params.referenceId,
    });

    return {
      provider: 'razorpay',
      providerReference: result.id,
      paymentLinkUrl: result.short_url,
      status: result.status,
    };
  }
}

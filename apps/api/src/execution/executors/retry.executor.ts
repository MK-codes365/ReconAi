import { razorpayIntegrationService } from '../../integrations/razorpay/razorpay.service';

export class RetryExecutor {
  public static async execute(params: { amountMinorUnit: bigint; receipt: string }) {
    const result = await razorpayIntegrationService.createOrder({
      amountMinorUnit: params.amountMinorUnit,
      receipt: params.receipt,
    });

    return {
      provider: 'razorpay',
      providerReference: result.id,
      status: result.status,
    };
  }
}

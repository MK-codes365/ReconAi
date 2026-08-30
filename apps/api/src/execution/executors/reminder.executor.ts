export class ReminderExecutor {
  public static async execute(params: { channel: string; recipient: string; message: string }) {
    console.log(`[TEST MODE NOTIFICATION] Sending ${params.channel} to ${params.recipient}: "${params.message}"`);
    return {
      provider: 'reconai-test-notification-provider',
      providerReference: `msg_test_${Date.now()}`,
      status: 'SENT',
      channel: params.channel,
      recipient: params.recipient,
    };
  }
}

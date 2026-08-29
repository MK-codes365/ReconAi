import { PaymentFailedHandler } from './handlers/payment-failed.handler';
import { PaymentCapturedHandler } from './handlers/payment-captured.handler';
import { OrderPaidHandler } from './handlers/order-paid.handler';
import { UnknownEventHandler } from './handlers/unknown-event.handler';

export class WebhookDispatcher {
  static async dispatch(payload: any, eventId: string, correlationId: string) {
    const eventType = payload.event || payload.eventType || '';

    switch (eventType) {
      case 'payment.failed':
        return await PaymentFailedHandler.handle(payload, eventId, correlationId);

      case 'payment.captured':
        return await PaymentCapturedHandler.handle(payload, eventId, correlationId);

      case 'order.paid':
        return await OrderPaidHandler.handle(payload, eventId, correlationId);

      default:
        return await UnknownEventHandler.handle(payload, eventId, correlationId);
    }
  }
}

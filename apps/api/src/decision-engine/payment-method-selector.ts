import { PaymentMethod } from './types/decision.types';

export class PaymentMethodSelector {
  public static selectMethod(params: {
    preferredMethod?: string | null;
    failureReason?: string;
  }): PaymentMethod {
    const preferred = (params.preferredMethod || '').toUpperCase();
    if (['UPI', 'CARD', 'NETBANKING', 'WALLET'].includes(preferred)) {
      return preferred as PaymentMethod;
    }

    const reason = (params.failureReason || '').toLowerCase();
    if (reason.includes('card')) return 'NETBANKING'; // Alternative when card fails
    return 'UPI';
  }
}

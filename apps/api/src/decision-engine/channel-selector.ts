import { CommunicationChannel } from './types/decision.types';

export class ChannelSelector {
  public static selectChannel(params: {
    actionType: string;
    customerPhone?: string | null;
    customerEmail?: string | null;
  }): CommunicationChannel {
    if (params.actionType === 'RETRY_NOW' || params.actionType === 'RETRY_LATER' || params.actionType === 'WAIT') {
      return 'SYSTEM';
    }

    if (params.actionType === 'HUMAN_REVIEW' || params.actionType === 'STOP') {
      return 'HUMAN_REVIEW';
    }

    if (params.actionType === 'PAYMENT_LINK' || params.actionType === 'REMINDER') {
      if (params.customerPhone) return 'SMS';
      if (params.customerEmail) return 'EMAIL';
      return 'PAYMENT_LINK';
    }

    return 'PAYMENT_LINK';
  }
}

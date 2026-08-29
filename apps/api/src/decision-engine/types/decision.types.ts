export type InterventionActionType = 
  | 'RETRY_NOW' 
  | 'RETRY_LATER' 
  | 'PAYMENT_LINK' 
  | 'ALTERNATIVE_PAYMENT_METHOD' 
  | 'REMINDER' 
  | 'WAIT' 
  | 'HUMAN_REVIEW' 
  | 'STOP';

export type CommunicationChannel = 
  | 'SMS' 
  | 'EMAIL' 
  | 'WHATSAPP' 
  | 'IN_APP' 
  | 'PAYMENT_LINK' 
  | 'SYSTEM' 
  | 'HUMAN_REVIEW';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';

export interface DecisionContextInput {
  caseId: string;
  caseNumber: string;
  caseType: string;
  amountAtRiskMinorUnit: bigint;
  failureReason: string;
  customer: {
    id: string;
    externalId: string;
    name: string;
    email: string;
    phone?: string | null;
    preferredPaymentMethod: string | null;
    tenureDays: number;
    communicationOptOut: boolean;
    contactsUsed: number;
    maximumContacts: number;
    retriesUsed: number;
    maximumRetries: number;
    cooldownHours: number;
    cooldownActive: boolean;
    lastContactAt?: Date | null;
  };
  paymentHistory: {
    attemptsCount: number;
    lastFailureReason?: string;
  };
  mlPrediction: {
    recoveryProbability: number;
    modelVersion: string;
  };
  llmAnalysis?: {
    category: string;
    confidence: number;
    riskFlags: string[];
    candidateInterventions: Array<{
      action: string;
      reason: string;
    }>;
    recommendedStrategy?: {
      strategy: string;
      reason: string;
    };
  } | null;
  contextVersion: number;
}

export interface EvaluatedCandidate {
  actionType: InterventionActionType;
  channel: CommunicationChannel;
  paymentMethod: PaymentMethod;
  recommendedAt: Date;
  recommendedWindowStart?: Date;
  recommendedWindowEnd?: Date;
  recoveryProbability: number;
  expectedRecoveryAmountMinorUnit: bigint;
  frictionScore: number; // 0.0 to 1.0
  riskScore: number;     // 0.0 to 1.0
  netRecoveryValueMinorUnit: bigint;
  reason: string;
  rank: number;
  selected: boolean;
}

export interface NextBestRecoveryMomentResult {
  caseId: string;
  selectedCandidate: EvaluatedCandidate;
  allEvaluatedCandidates: EvaluatedCandidate[];
  decisionConfidence: number; // 0.0 to 1.0
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  justification: string;
  decisionTrace: Record<string, any>;
  versioning: {
    decisionVersion: number;
    contextVersion: number;
    modelVersion: string;
    promptVersion: string;
    featureVersion: string;
  };
}

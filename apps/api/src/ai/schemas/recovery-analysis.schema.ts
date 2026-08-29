import { z } from 'zod';

export const DiagnosisCategorySchema = z.enum([
  'TEMPORARY_FAILURE',
  'PAYMENT_METHOD_ISSUE',
  'INSUFFICIENT_FUNDS',
  'CUSTOMER_ABANDONMENT',
  'REPEATED_FAILURE',
  'UNKNOWN',
]);

export const InterventionActionSchema = z.enum([
  'RETRY_NOW',
  'RETRY_LATER',
  'PAYMENT_LINK',
  'ALTERNATIVE_PAYMENT_METHOD',
  'REMINDER',
  'WAIT',
  'HUMAN_REVIEW',
  'STOP',
]);

export const RecoveryAnalysisSchema = z.object({
  diagnosis: z.object({
    category: DiagnosisCategorySchema,
    summary: z.string(),
    confidence: z.number().min(0.0).max(1.0),
  }),
  signals: z.array(
    z.object({
      signal: z.string(),
      importance: z.enum(['HIGH', 'MEDIUM', 'LOW']),
      evidenceRef: z.string().optional(),
    })
  ),
  customer_behavior_summary: z.string(),
  risk_flags: z.array(z.string()),
  candidate_interventions: z.array(
    z.object({
      action: InterventionActionSchema,
      reason: z.string(),
      expected_benefit: z.string(),
      potential_friction: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    })
  ),
  recommended_strategy: z.object({
    strategy: z.string(),
    reason: z.string(),
  }),
  draft_message: z
    .object({
      channel: z.enum(['SMS', 'EMAIL', 'WHATSAPP']),
      message: z.string(),
    })
    .optional(),
});

export type RecoveryAnalysisOutput = z.infer<typeof RecoveryAnalysisSchema>;

import { z } from 'zod';

export const CreateRecoveryCaseSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerExternalId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  failureReason: z.string().optional(),
  failureType: z.string().optional(),
  triggerType: z.enum(['payment_failed', 'checkout_abandoned']).default('payment_failed'),
});

export const ApproveActionSchema = z.object({
  caseId: z.string().uuid(),
  candidateActionType: z.string(),
  scheduledTime: z.string().optional(),
  reason: z.string().optional(),
});

export const TriggerDemoEventSchema = z.object({
  eventType: z.enum(['payment_failed', 'payment_success', 'checkout_abandoned']),
  amount: z.number().positive().default(5000),
  customerEmail: z.string().email().default('priya.sharma@example.com'),
  customerName: z.string().default('Priya Sharma'),
  failureReason: z.string().default('gateway_error'),
  paymentMethod: z.string().default('upi'),
});

export const PolicyEvaluationSchema = z.object({
  caseId: z.string().uuid(),
  actionType: z.string(),
  amount: z.number(),
  retryCount: z.number(),
  contactsCount: z.number(),
  cooldownHours: z.number(),
  optedOut: z.boolean(),
  confidence: z.number(),
});

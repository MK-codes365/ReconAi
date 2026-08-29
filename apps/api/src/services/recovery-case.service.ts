import { PrismaClient, PaymentStatus, CaseStatus, CaseType } from '@prisma/client';
import { auditService } from './audit.service';

const prisma = new PrismaClient();

export interface CreateCaseParams {
  customerExternalId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountMinorUnit: bigint;
  currency?: string;
  failureReason?: string;
  failureCode?: string;
  triggerType?: 'payment_failed' | 'checkout_abandoned';
  rawPayload?: any;
}

export class RecoveryCaseService {
  async ensureCustomer(data: {
    externalId: string;
    name: string;
    email: string;
    phone?: string;
  }) {
    let customer = await prisma.customer.findUnique({
      where: { externalId: data.externalId },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          externalId: data.externalId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          tenureDays: 30,
          preferredPaymentMethod: 'upi',
          attentionBudget: {
            create: {
              maximumContacts: 3,
              contactsUsed: 0,
              maximumRetries: 2,
              retriesUsed: 0,
              cooldownHours: 6,
              maximumAutomatedActions: 5,
              automatedActionsUsed: 0,
            },
          },
        },
      });
    }

    return customer;
  }

  async createCase(params: CreateCaseParams) {
    const customer = await this.ensureCustomer({
      externalId: params.customerExternalId,
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    });

    const year = new Date().getFullYear();
    const count = await prisma.recoveryCase.count();
    const caseNumber = `REC-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const merchantOrderId = params.providerOrderId || `ord_${Date.now()}`;
    const order = await prisma.order.upsert({
      where: { merchantOrderId },
      update: {},
      create: {
        merchantOrderId,
        customerId: customer.id,
        amountMinorUnit: params.amountMinorUnit,
        currency: params.currency || 'INR',
        providerOrderId: params.providerOrderId,
      },
    });

    const providerPaymentId = params.providerPaymentId || `pay_${Date.now()}`;
    const payment = await prisma.payment.upsert({
      where: { providerPaymentId },
      update: {
        status: params.triggerType === 'checkout_abandoned' ? PaymentStatus.PENDING : PaymentStatus.FAILED,
        failureReason: params.failureReason,
        failureCode: params.failureCode,
      },
      create: {
        providerPaymentId,
        providerOrderId: order.providerOrderId,
        customerId: customer.id,
        orderId: order.id,
        amountMinorUnit: params.amountMinorUnit,
        currency: params.currency || 'INR',
        status: params.triggerType === 'checkout_abandoned' ? PaymentStatus.PENDING : PaymentStatus.FAILED,
        paymentMethod: 'upi',
        failureReason: params.failureReason || 'gateway_failure',
        failureCode: params.failureCode || 'BAD_REQUEST_ERROR',
      },
    });

    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        caseNumber,
        customerId: customer.id,
        paymentId: payment.id,
        orderId: order.id,
        caseType: params.triggerType === 'checkout_abandoned' ? CaseType.CHECKOUT_ABANDONMENT : CaseType.FAILED_PAYMENT,
        status: CaseStatus.OPEN,
        amountAtRiskMinorUnit: params.amountMinorUnit,
        recoveredAmountMinorUnit: BigInt(0),
        reason: params.failureReason || 'gateway_error',
      },
    });

    await auditService.record({
      entityType: 'RecoveryCase',
      entityId: recoveryCase.id,
      eventType: 'CASE_CREATED',
      actorType: 'WEBHOOK',
      action: 'RECOVERY_CASE_CREATED',
      metadata: { caseNumber, amountMinorUnit: params.amountMinorUnit.toString() },
    });

    return recoveryCase;
  }

  async getCaseById(caseId: string) {
    return await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        customer: {
          include: { attentionBudget: true },
        },
        payment: {
          include: { attempts: true, order: true },
        },
        candidates: {
          orderBy: { rank: 'asc' },
        },
        actions: {
          orderBy: { createdAt: 'desc' },
          include: { policyDecisions: true },
        },
        outcomes: true,
        aiPredictions: true,
        mlPredictions: true,
        policyDecisions: {
          orderBy: { evaluatedAt: 'desc' },
        },
      },
    });
  }

  async getAllCases(limit: number = 100) {
    return await prisma.recoveryCase.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        candidates: true,
        policyDecisions: true,
      },
    });
  }
}

export const recoveryCaseService = new RecoveryCaseService();

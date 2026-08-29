import { 
  PrismaClient, UserRole, PaymentStatus, CaseType, CaseStatus, 
  ActionStatus, OutcomeType, PolicyDecisionResult, ActorType, NotificationChannel, AttributionType 
} from '@prisma/client';
import { PriorityCalculator } from '../apps/api/src/modules/recovery/priority-calculator';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Executing Phase 4 Seed Script: Generating 100+ Payments & Realistic Recovery Scenarios...');

  // 1. System Users
  await prisma.user.upsert({
    where: { email: 'admin@reconai.io' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@reconai.io',
      passwordHash: 'argon2_hashed_admin_key_2026',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // 2. Default System Policies
  const samplePolicies = [
    { name: 'MAX_RETRIES_LIMIT', description: 'Block automated retries if customer retries limit is reached', policyType: 'MAX_RETRIES', configuration: { maxRetries: 2 }, priority: 1 },
    { name: 'MAX_CONTACTS_LIMIT', description: 'Block communications if customer contact limit is reached', policyType: 'MAX_CONTACTS', configuration: { maxContacts: 3 }, priority: 1 },
    { name: 'COOLDOWN_PERIOD', description: 'Enforce minimum 6 hour cooldown between customer recovery contacts', policyType: 'COOLDOWN', configuration: { cooldownHours: 6 }, priority: 2 },
    { name: 'HIGH_VALUE_APPROVAL', description: 'Require human manager approval for transactions exceeding ₹25,000', policyType: 'HIGH_VALUE_APPROVAL', configuration: { maxAutomatedAmountMinorUnit: 2500000 }, priority: 3 },
  ];

  for (const pol of samplePolicies) {
    await prisma.policy.upsert({ where: { name: pol.name }, update: {}, create: pol });
  }

  // 3. 25 Synthetic Customers
  const customerNames = [
    'Priya Sharma', 'Rahul Verma', 'Ananya Patel', 'Vikram Singh', 'Aarav Mehta',
    'Neha Gupta', 'Rohan Iyer', 'Kavya Nair', 'Siddharth Rao', 'Pooja Joshi',
    'Aditya Kulkarni', 'Sneha Reddy', 'Tarun Bhatia', 'Ritu Agarwal', 'Manish Pandey',
    'Divya Saxena', 'Karan Malhotra', 'Isha Deshmukh', 'Amitabh Roy', 'Shweta Kumar',
    'Rajesh Nambiar', 'Meera Pillai', 'Gaurav Jain', 'Simran Kaur', 'Abhinav Das'
  ];

  const createdCustomers: any[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const name = customerNames[i];
    const externalId = `cust_syn_${(1001 + i)}`;
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    const phone = `+9198${(76543210 + i).toString()}`;

    const customer = await prisma.customer.upsert({
      where: { externalId },
      update: {},
      create: {
        externalId,
        name,
        email,
        phone,
        preferredPaymentMethod: ['upi', 'card', 'netbanking'][i % 3],
        timezone: 'Asia/Kolkata',
        tenureDays: 15 + (i * 10),
        communicationOptOut: i === 24, // 1 customer opted out
        attentionBudget: {
          create: {
            maximumContacts: 3,
            contactsUsed: i % 4,
            maximumRetries: 2,
            retriesUsed: i % 3,
            maximumAutomatedActions: 5,
            automatedActionsUsed: i % 5,
            cooldownHours: 6,
            lastContactAt: i % 2 === 0 ? new Date(Date.now() - (i + 1) * 3600 * 1000) : null,
          },
        },
      },
    });
    createdCustomers.push(customer);
  }

  // 4. Generate 100+ Payments & Relational Recovery Scenarios
  let totalPayments = 0;
  let totalCases = 0;

  for (let i = 0; i < 40; i++) { // 40 Orders * 2.5 Payments = 100 Payments
    const customer = createdCustomers[i % createdCustomers.length];
    const amountInr = [1500, 2800, 4500, 7500, 15000, 32000, 50000][i % 7];
    const amountMinorUnit = BigInt(amountInr * 100);

    const order = await prisma.order.create({
      data: {
        merchantOrderId: `ord_m_p4_${(1000 + i)}`,
        customerId: customer.id,
        amountMinorUnit,
        currency: 'INR',
        providerOrderId: `order_p4_${(7000 + i)}`,
      },
    });

    // Create 1-3 payment attempts per order
    const isFailedScenario = i % 3 !== 0;
    const isHighValue = amountInr > 25000;

    const payment = await prisma.payment.create({
      data: {
        providerPaymentId: `pay_p4_${(9000 + totalPayments)}`,
        providerOrderId: order.providerOrderId,
        customerId: customer.id,
        orderId: order.id,
        amountMinorUnit,
        currency: 'INR',
        status: isFailedScenario ? PaymentStatus.FAILED : PaymentStatus.CAPTURED,
        paymentMethod: customer.preferredPaymentMethod,
        failureReason: isFailedScenario ? (i % 2 === 0 ? 'temporary_gateway_issue' : 'insufficient_funds') : null,
        failureCode: isFailedScenario ? 'BAD_REQUEST_ERROR' : null,
        capturedAt: isFailedScenario ? null : new Date(),
        attempts: {
          create: [
            {
              attemptNumber: 1,
              status: isFailedScenario ? PaymentStatus.FAILED : PaymentStatus.CAPTURED,
              amountMinorUnit,
              failureReason: isFailedScenario ? 'Gateway timeout' : null,
              attemptedAt: new Date(Date.now() - (i + 1) * 3600 * 1000),
            },
          ],
        },
      },
    });

    totalPayments++;

    if (isFailedScenario) {
      const caseNumber = `REC-2026-${(totalCases + 1).toString().padStart(4, '0')}`;
      totalCases++;

      let caseStatus = CaseStatus.OPEN;
      let attribution = AttributionType.UNKNOWN;

      if (customer.communicationOptOut || isHighValue) {
        caseStatus = CaseStatus.ESCALATED;
      } else if (i % 4 === 0) {
        caseStatus = CaseStatus.RECOVERED;
        attribution = AttributionType.RECONAI_RECOVERED;
      } else if (i % 5 === 0) {
        caseStatus = CaseStatus.STOPPED;
      }

      const priorityCalc = PriorityCalculator.calculate({
        amountMinorUnit,
        failureReason: payment.failureReason || 'gateway_error',
        attemptsCount: 1,
        customerTenureDays: customer.tenureDays,
      });

      const recoveryCase = await prisma.recoveryCase.create({
        data: {
          caseNumber,
          customerId: customer.id,
          paymentId: payment.id,
          orderId: order.id,
          caseType: i % 4 === 0 ? CaseType.CHECKOUT_ABANDONMENT : CaseType.FAILED_PAYMENT,
          status: caseStatus,
          priority: priorityCalc.priority,
          priorityScore: priorityCalc.priorityScore,
          amountAtRiskMinorUnit: amountMinorUnit,
          recoveredAmountMinorUnit: caseStatus === CaseStatus.RECOVERED ? amountMinorUnit : 0n,
          remainingAmountAtRiskMinorUnit: caseStatus === CaseStatus.RECOVERED ? 0n : amountMinorUnit,
          attribution,
          reason: payment.failureReason,
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          candidates: {
            create: [
              {
                actionType: 'SEND_UPI_COLLECT',
                channel: 'SMS',
                paymentMethod: 'upi',
                scheduledTime: new Date(Date.now() + 1800 * 1000),
                recoveryProbability: 0.78,
                expectedRecoveryAmountMinorUnit: BigInt(Math.round(amountInr * 0.78 * 100)),
                frictionScore: 0.15,
                riskScore: 0.05,
                netRecoveryValueMinorUnit: BigInt(Math.round(amountInr * 0.75 * 100)),
                rank: 1,
                selected: true,
              },
            ],
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: 'RecoveryCase',
          entityId: recoveryCase.id,
          eventType: 'RECOVERY_CASE_CREATED',
          actorType: ActorType.WEBHOOK,
          action: 'CREATED_CASE',
          metadata: { caseNumber, amountInr },
        },
      });
    }
  }

  console.log(`✅ Phase 4 Seed Complete! Successfully created ${createdCustomers.length} customers, 40 orders, ${totalPayments} payments, and ${totalCases} recovery cases.`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

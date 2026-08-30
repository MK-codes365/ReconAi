import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.resolve(process.cwd(), '../api/data/store.json');

function getStoreData(): any {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (_) {}
  return { cases: [], auditLogs: [], journeyEvents: [], notifications: [], users: [] };
}

function saveStoreData(data: any) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving store on Vercel/Next.js:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const eventType = payload.event || 'payment.failed';
    const paymentEntity = payload.payload?.payment?.entity || payload.payment?.entity || {};

    const amountInr = (paymentEntity.amount || 300000) / 100;
    const customerName = paymentEntity.notes?.customer_name || paymentEntity.email?.split('@')[0] || 'Mukut Kumar';
    const customerEmail = paymentEntity.email || 'mukutkumar842@gmail.com';
    const customerPhone = paymentEntity.contact || '+919876543210';
    const failureReason = paymentEntity.error_description || paymentEntity.error_reason || 'Bank network timeout during OTP';

    console.log(`📡 [VERCEL WEBHOOK RECEIVED] ${eventType} for ${customerName} (₹${amountInr})`);

    const store = getStoreData();

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const activeCase = store.cases.find((c: any) => c.status !== 'RECOVERED');
      if (activeCase) {
        activeCase.status = 'RECOVERED';
        activeCase.recoveredAmountInr = amountInr;
        activeCase.updatedAt = new Date().toISOString();
      } else {
        const caseNumber = `REC-2026-${(store.cases.length + 1).toString().padStart(3, '0')}`;
        store.cases.unshift({
          id: `case_${Date.now()}`,
          caseNumber,
          caseType: 'PAYMENT_CAPTURE',
          status: 'RECOVERED',
          priority: amountInr >= 25000 ? 'HIGH' : 'MEDIUM',
          priorityScore: 88,
          amountAtRiskInr: amountInr,
          recoveredAmountInr: amountInr,
          customerName,
          customerEmail,
          customerPhone,
          failureReason: 'Razorpay Direct Payment Capture',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          optimalAction: 'WHATSAPP_RECOVERY',
          optimalChannel: 'WHATSAPP',
        });
      }
      saveStoreData(store);
    } else {
      const caseNumber = `REC-2026-${(store.cases.length + 1).toString().padStart(3, '0')}`;
      const caseId = `case_${Date.now()}`;

      const newCase = {
        id: caseId,
        caseNumber,
        caseType: 'PAYMENT_FAILURE',
        status: 'PENDING_ACTION',
        priority: amountInr >= 25000 ? 'HIGH' : 'MEDIUM',
        priorityScore: amountInr >= 25000 ? 94 : 78,
        amountAtRiskInr: amountInr,
        recoveredAmountInr: 0,
        customerName,
        customerEmail,
        customerPhone,
        failureReason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        optimalAction: 'SEND_PAYMENT_LINK_WHATSAPP',
        optimalChannel: 'WHATSAPP',
        paymentLinkUrl: `/pay/${caseId}`,
        customer: {
          id: `cust_${Date.now()}`,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          attentionBudget: {
            contactsUsed: 1,
            maximumContacts: 3,
            retriesUsed: 0,
            maximumRetries: 2,
            cooldownHours: 6
          }
        },
        candidates: [
          {
            id: `cand_${Date.now()}`,
            rank: 1,
            actionType: 'SEND_PAYMENT_LINK_WHATSAPP',
            channel: 'WHATSAPP',
            paymentMethod: 'UPI_INTENT',
            recoveryProbability: 0.78,
            frictionScore: 0.15,
            netRecoveryValueMinorUnit: `${amountInr * 100 * 0.78}`,
            scheduledTime: new Date(Date.now() + 1000 * 20).toISOString(),
            selected: true,
            reason: 'Optimal recovery channel with high predicted conversion on mobile.'
          }
        ]
      };

      store.cases.unshift(newCase);
      saveStoreData(store);
    }

    return NextResponse.json({
      status: 'SUCCESS',
      eventId: paymentEntity.id || `evt_${Date.now()}`,
      eventType,
      amountInr,
      processedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (err: any) {
    console.error('Error processing Razorpay webhook in Next.js:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'READY', endpoint: 'Razorpay Webhook Handler on Vercel' });
}

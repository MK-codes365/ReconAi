import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from '@reconai/config';
import { HealthController } from './modules/health/health.controller';
import { QueueService } from './modules/queue/queue.service';
import { WebhookController } from './modules/webhooks/webhook.controller';
import { DevEventsController } from './modules/dev/dev-events.controller';
import { RecoveryController } from './modules/recovery/recovery.controller';
import { metricsService } from './services/metrics.service';
import { policyEngineService } from './services/policy-engine.service';
import { executionEngineService } from './services/execution.service';
import { auditService } from './services/audit.service';
import { llmDiagnosisService } from './services/llm-diagnosis.service';
import { decisionEngineService } from './services/decision.service';
import { recoveryCaseService } from './services/recovery-case.service';
import { wsService } from './services/websocket.service';
import './modules/webhooks/webhook.worker';

const app = express();
const server = http.createServer(app);

wsService.init(server);
QueueService.initializeQueues();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Phase 1 & 2 Health Check Endpoint
app.get('/health', HealthController.getHealth);

// Phase 3 Real-time Razorpay Webhook Ingestion
app.post('/webhooks/razorpay', WebhookController.handleWebhook);
app.post('/api/admin/webhooks/:id/replay', WebhookController.replayWebhook);
app.post('/api/dev/events/payment-failed', DevEventsController.triggerPaymentFailed);
app.post('/api/dev/events/payment-captured', DevEventsController.triggerPaymentCaptured);

// Phase 4 Core Revenue Recovery Engine API Routes
app.get('/api/recovery/cases', RecoveryController.listCases);
app.get('/api/recovery/cases/:id', RecoveryController.getCaseById);
app.post('/api/recovery/cases/:id/stop', RecoveryController.stopCase);
app.post('/api/recovery/cases/:id/escalate', RecoveryController.escalateCase);
app.get('/api/analytics/recovery', RecoveryController.getAnalytics);
app.post('/api/batch/recovery/analyze', RecoveryController.analyzeBatch);

// Dashboard Metrics
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getLiveMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Case Analysis & Execution
app.post('/api/recovery/cases/:id/analyze', async (req, res) => {
  try {
    const caseRecord = await recoveryCaseService.getCaseById(req.params.id);
    if (!caseRecord) return res.status(404).json({ error: 'Case not found' });

    wsService.broadcast('recovery.analyzing', { caseId: caseRecord.id });

    const amountInr = Number(caseRecord.amountAtRiskMinorUnit) / 100;
    const diagnosis = await llmDiagnosisService.diagnoseCase({
      caseNumber: caseRecord.caseNumber,
      amount: amountInr,
      failureReason: caseRecord.reason || 'gateway_error',
      triggerType: caseRecord.caseType,
      customerName: caseRecord.customer.name,
      tenureDays: caseRecord.customer.tenureDays,
      historicalSuccessCount: 5,
      historicalFailureCount: 1,
      hourOfDay: new Date().getHours(),
    });

    const decision = await decisionEngineService.evaluateAndSelectNextBestMoment(caseRecord.id, diagnosis.candidateInterventions);

    const policyResult = await policyEngineService.evaluateAction({
      caseId: caseRecord.id,
      actionType: decision.selectedMoment.actionType,
    });

    wsService.broadcast('recovery.decision_ready', {
      caseId: caseRecord.id,
      diagnosis,
      decision,
      policyResult,
    });

    res.json({
      status: 'SUCCESS',
      diagnosis,
      decision,
      policyResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recovery/cases/:id/execute', async (req, res) => {
  try {
    const { actionType, channel } = req.body;
    const result = await executionEngineService.executeAction({
      caseId: req.params.id,
      actionType,
      channel: channel || 'SMS',
    });

    wsService.broadcast('action.executed', { caseId: req.params.id, result });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit', async (req, res) => {
  try {
    const logs = await auditService.getRecentLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`🚀 ReconAI Backend API running on port ${PORT}`);
});

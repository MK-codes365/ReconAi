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
import { aiService } from './ai/ai.service';
import { decisionEngineService } from './decision-engine/decision-engine.service';
import { recoveryCaseService } from './services/recovery-case.service';
import { wsService } from './services/websocket.service';
import './modules/webhooks/webhook.worker';
import './modules/ml/ml-prediction.worker';
import './ai/ai.worker';
import './decision-engine/decision-engine.worker';

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

// Phase 6 Real LLM Diagnosis Endpoints
app.get('/api/recovery/cases/:id/analysis', async (req, res) => {
  try {
    const analysis = await aiService.getLatestAnalysis(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'AI Analysis not found for this case' });
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recovery/cases/:id/analyze', async (req, res) => {
  try {
    const caseRecord = await recoveryCaseService.getCaseById(req.params.id);
    if (!caseRecord) return res.status(404).json({ error: 'Case not found' });

    const forceReanalyze = req.body.force === true;
    const aiRecord = await aiService.analyzeCase(req.params.id, forceReanalyze);

    res.json({
      status: 'SUCCESS',
      aiAnalysis: aiRecord,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 7 Next Best Recovery Moment Decision Engine Endpoints
app.post('/api/recovery/cases/:id/decision', async (req, res) => {
  try {
    const result = await decisionEngineService.generateNextBestMoment(req.params.id);
    res.json({ status: 'SUCCESS', decision: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recovery/cases/:id/decision', async (req, res) => {
  try {
    const decision = await decisionEngineService.getLatestDecision(req.params.id);
    if (!decision) return res.status(404).json({ error: 'No active decision found for this case' });
    res.json(decision);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recovery/cases/:id/candidates', async (req, res) => {
  try {
    const candidates = await decisionEngineService.getEvaluatedCandidates(req.params.id);
    res.json(candidates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Metrics
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getLiveMetrics();
    res.json(metrics);
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

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

export interface RecoveryCaseRecord {
  id: string;
  caseNumber: string;
  caseType: string;
  status: string;
  priority: string;
  priorityScore: number;
  amountAtRiskInr: number;
  recoveredAmountInr: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  failureReason: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  optimalAction?: string;
  optimalChannel?: string;
  paymentLinkUrl?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    attentionBudget: {
      contactsUsed: number;
      maximumContacts: number;
      retriesUsed: number;
      maximumRetries: number;
      cooldownHours: number;
    };
  };
  candidates: Array<{
    id: string;
    rank: number;
    actionType: string;
    channel: string;
    paymentMethod: string;
    recoveryProbability: number;
    frictionScore: number;
    netRecoveryValueMinorUnit: string;
    scheduledTime: string;
    selected: boolean;
    reason: string;
  }>;
}

export interface AuditLogRecord {
  id: string;
  entityType: string;
  entityId?: string;
  eventType: string;
  actorType: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface JourneyEventRecord {
  id: string;
  customerId: string;
  eventType: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'OPERATOR';
  isActive: boolean;
  createdAt: string;
}

interface StoreData {
  cases: RecoveryCaseRecord[];
  auditLogs: AuditLogRecord[];
  journeyEvents: JourneyEventRecord[];
  notifications: any[];
  users: UserRecord[];
}

const INITIAL_CASES: RecoveryCaseRecord[] = [];
const INITIAL_LOGS: AuditLogRecord[] = [];
const INITIAL_JOURNEY: JourneyEventRecord[] = [];
const INITIAL_USERS: UserRecord[] = [
  {
    id: 'usr_admin_001',
    name: 'Lead System Administrator',
    email: 'admin@reconai.io',
    passwordHash: 'admin123',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_operator_001',
    name: 'Recovery Operations Lead',
    email: 'operator@reconai.io',
    passwordHash: 'operator123',
    role: 'OPERATOR',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

export class PersistentStore {
  private data: StoreData;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadFromDisk();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromDisk(): StoreData {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          cases: Array.isArray(parsed.cases) ? parsed.cases : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          journeyEvents: Array.isArray(parsed.journeyEvents) ? parsed.journeyEvents : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_USERS,
        };
      }
    } catch (err) {
      console.warn('⚠️ [PersistentStore] Error loading store.json, initializing fresh store:', err);
    }

    const fresh: StoreData = {
      cases: INITIAL_CASES,
      auditLogs: INITIAL_LOGS,
      journeyEvents: INITIAL_JOURNEY,
      notifications: [],
      users: INITIAL_USERS,
    };
    this.saveToDisk(fresh);
    return fresh;
  }

  public getUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  }

  public addUser(user: UserRecord): UserRecord {
    const existingIdx = this.data.users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase().trim());
    if (existingIdx >= 0) {
      this.data.users[existingIdx] = user;
    } else {
      this.data.users.push(user);
    }
    this.saveToDisk();
    return user;
  }

  public getUsers(): UserRecord[] {
    return this.data.users;
  }

  private saveToDisk(dataToSave?: StoreData) {
    try {
      this.ensureDataDir();
      const payload = dataToSave || this.data;
      fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.error('❌ [PersistentStore] Failed to write store.json:', err);
    }
  }

  public getCases(status?: string, search?: string): RecoveryCaseRecord[] {
    let list = this.data.cases;
    if (status && status !== 'ALL') {
      list = list.filter((c) => c.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.caseNumber.toLowerCase().includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.customerEmail && c.customerEmail.toLowerCase().includes(q)) ||
        (c.failureReason && c.failureReason.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getCaseById(id: string): RecoveryCaseRecord | undefined {
    return this.data.cases.find((c) => c.id === id || c.caseNumber === id);
  }

  public addCase(caseRecord: RecoveryCaseRecord): RecoveryCaseRecord {
    const existingIdx = this.data.cases.findIndex((c) => c.id === caseRecord.id || c.caseNumber === caseRecord.caseNumber);
    if (existingIdx >= 0) {
      this.data.cases[existingIdx] = { ...this.data.cases[existingIdx], ...caseRecord, updatedAt: new Date().toISOString() };
    } else {
      this.data.cases.unshift(caseRecord);
    }
    this.saveToDisk();
    return caseRecord;
  }

  public updateCase(id: string, updates: Partial<RecoveryCaseRecord>): RecoveryCaseRecord | undefined {
    const caseRecord = this.data.cases.find((c) => c.id === id || c.caseNumber === id);
    if (!caseRecord) return undefined;

    Object.assign(caseRecord, updates, { updatedAt: new Date().toISOString() });
    this.saveToDisk();
    return caseRecord;
  }

  public recordPaymentRecovery(id: string, amountRecoveredInr: number): RecoveryCaseRecord | undefined {
    const caseRecord = this.getCaseById(id);
    if (!caseRecord) return undefined;

    caseRecord.status = 'RECOVERED';
    caseRecord.recoveredAmountInr = amountRecoveredInr;
    caseRecord.updatedAt = new Date().toISOString();

    this.addAuditLog({
      id: `audit_${Date.now()}`,
      entityType: 'RecoveryCase',
      entityId: caseRecord.id,
      eventType: 'PAYMENT_RECOVERED',
      actorType: 'CUSTOMER',
      action: 'PAYMENT_COMPLETED_VIA_PORTAL',
      timestamp: new Date().toISOString(),
      metadata: {
        caseNumber: caseRecord.caseNumber,
        recoveredAmountInr: amountRecoveredInr,
        customerEmail: caseRecord.customerEmail,
      },
    });

    this.addJourneyEvent({
      id: `j_${Date.now()}`,
      customerId: caseRecord.customer.id,
      eventType: 'PAYMENT_SUCCESS',
      title: 'Payment Successfully Recovered',
      description: `Customer completed payment of ₹${amountRecoveredInr.toLocaleString('en-IN')}. Case marked RECOVERED.`,
      timestamp: new Date().toISOString(),
    });

    this.saveToDisk();
    return caseRecord;
  }

  public getMetrics() {
    const totalRecoveryCases = this.data.cases.length;
    const recoveredCases = this.data.cases.filter((c) => c.status === 'RECOVERED').length;
    const activeCases = this.data.cases.filter((c) => c.status === 'ACTION_SCHEDULED' || c.status === 'ACTION_EXECUTING' || c.status === 'PENDING_ACTION' || c.status === 'OPEN').length;
    const openCases = this.data.cases.filter((c) => c.status === 'OPEN' || c.status === 'PENDING_ACTION').length;
    const escalatedCases = this.data.cases.filter((c) => c.status === 'ESCALATED').length;
    const stoppedCases = this.data.cases.filter((c) => c.status === 'STOPPED').length;

    let totalRevenueAtRiskInr = 0;
    let totalRecoveredRevenueInr = 0;

    for (const c of this.data.cases) {
      totalRevenueAtRiskInr += c.amountAtRiskInr || 0;
      if (c.status === 'RECOVERED') {
        totalRecoveredRevenueInr += c.recoveredAmountInr || c.amountAtRiskInr || 0;
      }
    }

    const remainingRevenueAtRiskInr = totalRevenueAtRiskInr - totalRecoveredRevenueInr;
    const recoveryRate = totalRevenueAtRiskInr > 0 ? (totalRecoveredRevenueInr / totalRevenueAtRiskInr) * 100 : 0;

    return {
      totalRecoveryCases,
      openCases,
      activeCases,
      recoveredCases,
      failedCases: 0,
      escalatedCases,
      stoppedCases,
      totalRevenueAtRiskInr,
      totalRecoveredRevenueInr,
      remainingRevenueAtRiskInr,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
    };
  }

  public addAuditLog(log: AuditLogRecord): AuditLogRecord {
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveToDisk();
    return log;
  }

  public getAuditLogs(limit: number = 50): AuditLogRecord[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public addJourneyEvent(event: JourneyEventRecord): JourneyEventRecord {
    this.data.journeyEvents.unshift(event);
    this.saveToDisk();
    return event;
  }

  public getJourneyForCustomer(customerId: string): JourneyEventRecord[] {
    return this.data.journeyEvents.filter((j) => j.customerId === customerId);
  }

  public clearAll() {
    this.data = {
      cases: [],
      auditLogs: [],
      journeyEvents: [],
      notifications: [],
      users: INITIAL_USERS,
    };
    this.saveToDisk();
  }
}

export const persistentStore = new PersistentStore();

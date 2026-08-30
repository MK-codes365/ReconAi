import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class DatabaseStateManager {
  private isConnected: boolean | null = null;
  private lastCheckTime = 0;
  private hasLoggedWarning = false;

  async isDatabaseAvailable(): Promise<boolean> {
    const now = Date.now();
    // Cache connection status for 30 seconds to avoid repeating failed connection attempts on every request
    if (this.isConnected !== null && now - this.lastCheckTime < 30000) {
      return this.isConnected;
    }

    this.lastCheckTime = now;
    try {
      await prisma.$queryRaw`SELECT 1`;
      if (!this.isConnected) {
        console.log('✅ PostgreSQL connected successfully (localhost:5432).');
      }
      this.isConnected = true;
      return true;
    } catch (_) {
      if (!this.hasLoggedWarning) {
        console.log('ℹ️ PostgreSQL (localhost:5432) is offline. ReconAI running in Autonomous In-Memory Mode.');
        this.hasLoggedWarning = true;
      }
      this.isConnected = false;
      return false;
    }
  }
}

export const dbState = new DatabaseStateManager();

import { PrismaClient } from '@prisma/client';

export class DatabaseService {
  private static instance: PrismaClient | null = null;

  public static getClient(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });
    }
    return DatabaseService.instance;
  }

  public static async isConnected(): Promise<boolean> {
    try {
      const client = DatabaseService.getClient();
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      console.error('Database connection error:', err);
      return false;
    }
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect();
      DatabaseService.instance = null;
    }
  }
}

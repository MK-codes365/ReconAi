import { PrismaClient } from '@prisma/client';
import { 
  RECOVERY_DIAGNOSIS_PROMPT_NAME, 
  RECOVERY_DIAGNOSIS_PROMPT_VERSION, 
  RECOVERY_DIAGNOSIS_SYSTEM_PROMPT 
} from './recovery-diagnosis.prompt';

const prisma = new PrismaClient();

export class PromptManager {
  public static async ensureActivePrompts(): Promise<void> {
    try {
      await prisma.promptVersion.upsert({
        where: { version: RECOVERY_DIAGNOSIS_PROMPT_VERSION },
        update: {
          prompt: RECOVERY_DIAGNOSIS_SYSTEM_PROMPT,
          status: 'ACTIVE',
        },
        create: {
          name: RECOVERY_DIAGNOSIS_PROMPT_NAME,
          version: RECOVERY_DIAGNOSIS_PROMPT_VERSION,
          prompt: RECOVERY_DIAGNOSIS_SYSTEM_PROMPT,
          purpose: 'Structured LLM Root Cause Diagnosis & Intervention Analysis',
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });
    } catch (_) {
      // In-memory fallback if database is offline
    }
  }

  public static async getActivePrompt(version: string = RECOVERY_DIAGNOSIS_PROMPT_VERSION): Promise<string> {
    try {
      const record = await prisma.promptVersion.findUnique({ where: { version } });
      return record?.prompt || RECOVERY_DIAGNOSIS_SYSTEM_PROMPT;
    } catch (_) {
      return RECOVERY_DIAGNOSIS_SYSTEM_PROMPT;
    }
  }
}

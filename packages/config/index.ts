import * as dotenv from 'dotenv';
import path from 'path';

// Search current directory, parent directories, and workspace root for .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'reconai-super-secret-jwt-key-change-in-prod-2026',
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_reconai_buildathon_secret',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',

  policyThresholds: {
    maxAutomatedAmount: parseFloat(process.env.MAX_AUTOMATED_AMOUNT || '25000'),
    minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.50'),
    defaultMaxRetries: parseInt(process.env.DEFAULT_MAX_RETRIES || '2', 10),
    defaultMaxContacts: parseInt(process.env.DEFAULT_MAX_CONTACTS || '3', 10),
    defaultCooldownHours: parseInt(process.env.DEFAULT_COOLDOWN_HOURS || '6', 10),
  }
};

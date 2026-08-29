import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reconai?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'reconai-super-secret-jwt-key-change-in-prod-2026',
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_reconai_buildathon_secret',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  
  policyThresholds: {
    maxAutomatedAmount: parseFloat(process.env.MAX_AUTOMATED_AMOUNT || '25000'), // High amount requires human approval
    minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.50'),
    defaultMaxRetries: parseInt(process.env.DEFAULT_MAX_RETRIES || '2', 10),
    defaultMaxContacts: parseInt(process.env.DEFAULT_MAX_CONTACTS || '3', 10),
    defaultCooldownHours: parseInt(process.env.DEFAULT_COOLDOWN_HOURS || '6', 10),
  }
};

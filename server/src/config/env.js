import dotenv from 'dotenv';
dotenv.config();

// Export environment configuration with defaults
export const config = {
  port: process.env.PORT || 3000,
  databaseUrl:
    process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST
      ? process.env.DATABASE_URL_TEST
      : process.env.DATABASE_URL,
  databaseUrlTest: process.env.DATABASE_URL_TEST,
  jwtSecret: process.env.JWT_SECRET || 'dev_fallback_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};

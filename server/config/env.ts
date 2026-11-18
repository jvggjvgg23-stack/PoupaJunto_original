import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: Number(process.env.DEFAULT_APP_PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOCAL_TOKEN_SIGNING_KEY: 'poupajunto-local-session-integra-senai-2026',
  DEFAULT_SUPERADMIN_PASS: 'TechMinds@2026',
};

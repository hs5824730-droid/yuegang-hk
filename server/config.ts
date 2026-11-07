import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });
export { cities, tourHosts, type City } from './policy.js';
export const config = {
  port: Number(process.env.PORT || 3001),
  production: process.env.NODE_ENV === 'production',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  dbPath: process.env.DATABASE_PATH || path.resolve('data/platform.sqlite'),
  uploadDir: process.env.UPLOAD_DIR || path.resolve('uploads'),
  viewingSourceDir: process.env.VIEWING_SOURCE_DIR || path.resolve('data/viewing-source'),
  viewingVideoDir: process.env.VIEWING_VIDEO_DIR || path.resolve('data/viewing-video'),
  sessionSecret: process.env.SESSION_SECRET || '',
  telegramToken: process.env.DISABLE_TELEGRAM === 'true' ? '' : process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.DISABLE_TELEGRAM === 'true' ? '' : process.env.TELEGRAM_CHAT_ID || '',
  whatsappNumber: (process.env.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, ''),
  brand: { zh: process.env.BRAND_ZH || '桉湾', en: process.env.BRAND_EN || 'EUCOVE' },
};

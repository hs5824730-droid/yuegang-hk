// Explicit local-only browser test fixture. Never uses production data or sends Telegram messages.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'house-browser-test-'));
process.env.PORT = '3002';
process.env.APP_URL = 'http://127.0.0.1:3002';
process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
process.env.UPLOAD_DIR = path.join(directory, 'uploads');
process.env.DISABLE_TELEGRAM = 'true';
process.env.ADMIN_EMAIL = 'smoke@example.test';
process.env.ADMIN_PASSWORD = 'BrowserSmokePassword2026';
process.env.SESSION_SECRET = 'browser-fixture-only-key-12345678901234567890';
process.env.NODE_ENV = 'test';
await import('./index.js');

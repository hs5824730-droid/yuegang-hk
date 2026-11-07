import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { passwordHash } from './auth.js';
import { userSchema } from './schema.js';

const email = process.env.NEW_ADMIN_EMAIL;
const password = process.env.NEW_ADMIN_PASSWORD;
if (!email || !password) {
  console.error('请设置 NEW_ADMIN_EMAIL 和 NEW_ADMIN_PASSWORD（至少12位）后运行 npm run admin:create');
  process.exitCode = 1;
} else {
  const user = userSchema.parse({ name: process.env.NEW_ADMIN_NAME || 'Administrator', email, password, role: 'admin' });
  if (db.prepare('SELECT id FROM users WHERE email=?').get(user.email)) {
    console.error('该邮箱已存在；不会覆盖已有账号。'); process.exitCode = 1;
  } else {
    db.prepare('INSERT INTO users(id,name,email,password_hash,role,city,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(randomUUID(), user.name, user.email, passwordHash(user.password), 'admin', null, new Date().toISOString());
    console.log('管理员账号已建立。');
  }
}

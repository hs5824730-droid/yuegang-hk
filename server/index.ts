import { createApp } from './app.js';
import { config } from './config.js';
import { deliverNotifications } from './notifications.js';
import {syncRentalRegistrations} from './registration-sheets.js';
import {syncCustomerRegistrations} from './customer-registration-sheets.js';
import {db,transaction} from './db.js';
const registrationDb={all:async(sql:string,args:unknown[]=[])=>db.prepare(sql).all(...args as any[]) as Record<string,any>[],batch:async(qs:{sql:string;args:unknown[]}[])=>transaction(()=>{for(const q of qs)db.prepare(q.sql).run(...q.args as any[])})};
const app = createApp();
const server = app.listen(config.port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Property server ready at http://127.0.0.1:${config.port}`);
});
const timer = setInterval(() => { void deliverNotifications().catch(() => console.error('Notification worker failed')); }, 15000);
timer.unref();
// Google latency must not hold the existing notification worker's process-wide busy flag.
const registrationTimer=setInterval(()=>void Promise.allSettled([syncRentalRegistrations(registrationDb,process.env),syncCustomerRegistrations(registrationDb,process.env)]).then(results=>{if(results.some(r=>r.status==='rejected'))console.error(JSON.stringify({event:'registration_sheet_worker_error'}))}),60000);registrationTimer.unref();
void deliverNotifications().catch(() => console.error('Notification worker failed'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(timer);clearInterval(registrationTimer); server.close(() => process.exit(0)); });

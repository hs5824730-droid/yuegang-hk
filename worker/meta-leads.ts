import { importMetaLead } from '../server/meta-lead-import';
import type { AppEnv } from './env';
import { deliverNotifications } from './notifications';
export async function importMetaSheetLead(request:Request, env:AppEnv, ctx:ExecutionContext) {
  const db={all:async(sql:string,args:unknown[]=[]) => (await env.DB.prepare(sql).bind(...args).all<Record<string,any>>()).results,
    batch:async(qs:{sql:string;args:unknown[]}[])=>{await env.DB.batch(qs.map(q=>env.DB.prepare(q.sql).bind(...q.args)));}};
  const response=await importMetaLead(request,{secret:env.META_SHEETS_IMPORT_SECRET,spreadsheetId:env.META_SHEETS_SPREADSHEET_ID,formIds:env.META_LEAD_FORM_IDS,signalEnabled:env.SIGNAL_ENABLED==='true'},db);
  if(response.ok)ctx.waitUntil(deliverNotifications(env,1).catch(()=>console.error(JSON.stringify({event:'meta_import_notification_error'}))));
  return response;
}

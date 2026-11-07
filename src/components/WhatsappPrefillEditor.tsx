import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from '../api';
import {useI18n} from '../i18n';
import {DEFAULT_WHATSAPP_PREFILL,renderWhatsappPrefill,validPrefillTemplate,type WhatsappPrefillConfig} from '../whatsapp-prefill';
import './whatsapp-prefill.css';

export default function WhatsappPrefillEditor({onExpire}:{onExpire:()=>void}){
 const {L}=useI18n();const [saved,setSaved]=useState<WhatsappPrefillConfig>();const [draft,setDraft]=useState({...DEFAULT_WHATSAPP_PREFILL});const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const inputs=useRef<Partial<Record<'zh'|'en',HTMLTextAreaElement|null>>>({});
 const dirty=!!saved&&(saved.zh!==draft.zh||saved.en!==draft.en);
 function fail(e:unknown){if(e instanceof ApiError&&e.status===401)onExpire();setError(e instanceof Error?e.message:L('保存失敗，請重試；草稿已保留。','Save failed. Your draft is kept; try again.'));}
 async function load(){try{const result=await api.whatsappPrefill();setSaved(result);setDraft({zh:result.zh,en:result.en});setError('');}catch(e){fail(e);}}
 useEffect(()=>{void load();},[]);
 function insert(lang:'zh'|'en',token:string){const input=inputs.current[lang],start=input?.selectionStart??draft[lang].length,end=input?.selectionEnd??start;setDraft({...draft,[lang]:draft[lang].slice(0,start)+token+draft[lang].slice(end)});setNotice('');requestAnimationFrame(()=>{input?.focus();input?.setSelectionRange(start+token.length,start+token.length);});}
 async function save(){if(!saved)return;if(!validPrefillTemplate(draft.zh)||!validPrefillTemplate(draft.en)){setError(L('請使用純文本及所列變量，最多500字，不支持網址或HTML。','Use plain text and the listed variables, up to 500 characters. URLs and HTML are not supported.'));return;}setBusy(true);setError('');setNotice('');try{const result=await api.saveWhatsappPrefill({...draft,expectedVersion:saved.version});setSaved(result);setNotice(L('WhatsApp 進線語已保存','WhatsApp greeting saved'));}catch(e){fail(e);}finally{setBusy(false);}}
 return <details className="wa-prefill-editor"><summary>{L('WhatsApp 進線語','WhatsApp chat greeting')}<span>{L('全局 · 客戶聊天框預填文字','Global · prefilled chat draft')}</span></summary><div className="wa-prefill-content">
 <p className="admin-subtitle">{L('客戶提交後按查詢語言預填，可自行修改再發送。留空表示不預填；不會自動替客戶發消息。','Prefills a draft in the enquiry language. Customers can edit and send it themselves. Leave blank for no prefill.')}</p>
 {!saved&&!error&&<p role="status">{L('加載進線語…','Loading greeting…')}</p>}
 <div className="wa-prefill-grid">{(['zh','en'] as const).map(lang=><section key={lang} className="wa-prefill-language"><label className="field">{lang==='zh'?L('中文進線語','Chinese greeting'):L('英文進線語','English greeting')}<textarea ref={el=>{inputs.current[lang]=el;}} rows={3} maxLength={500} disabled={!saved||busy} value={draft[lang]} onChange={e=>{setDraft({...draft,[lang]:e.target.value});setNotice('');}}/></label><div className="wa-prefill-variables" role="group" aria-label={L('插入變量','Insert variable')}>{[{label:L('房屋地區','Property city'),token:lang==='zh'?'{房屋地區}':'{city}'},{label:L('服務類型','Service type'),token:lang==='zh'?'{服務類型}':'{service}'}].map(v=><button type="button" className="btn btn-line" key={v.token} disabled={!saved||busy} onClick={()=>insert(lang,v.token)}>{v.label} <code>{v.token}</code></button>)}</div><p className="wa-prefill-preview-label">{L('虛構預覽：墨爾本 · 放租','Fictional preview: Melbourne · letting')}</p><p className="wa-prefill-preview">{renderWhatsappPrefill(draft,{city:'Melbourne',service:'letting',language:lang})||L('不預填文字','No prefilled text')}</p></section>)}</div>
 <p className="admin-subtitle">{L('未提供地區或服務時使用通用稱呼；過長文字以預覽中的截短結果為準。修改僅影響以後新分配，歷史連結不變。','Missing context uses general wording. Long text follows the shortened preview. Changes affect new assignments; historical links stay unchanged.')}</p>
 {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="admin-feedback" role="status">{notice}</p>}
 <div className="row-actions">{error&&<button type="button" className="btn btn-line" disabled={busy} onClick={()=>void load()}>{L('重新載入已保存內容','Reload saved content')}</button>}<button type="button" className="btn btn-line" disabled={!saved||busy} onClick={()=>{setDraft({...DEFAULT_WHATSAPP_PREFILL});setNotice('');}}>{L('恢復預設草稿','Use default draft')}</button><button type="button" className="btn btn-primary" disabled={!dirty||busy} onClick={()=>void save()}>{busy?L('保存中…','Saving…'):L('保存進線語','Save greeting')}</button></div>
 </div></details>;
}

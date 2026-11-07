import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from '../api';
import {useI18n} from '../i18n';
import {DEFAULT_WHATSAPP_PREFILL,renderWhatsappPrefill,validPrefillTemplate,type WhatsappPrefillConfig} from '../whatsapp-prefill';
import './whatsapp-prefill.css';

export default function WhatsappPrefillEditor({onExpire}:{onExpire:()=>void}){
 const {L}=useI18n();const [saved,setSaved]=useState<WhatsappPrefillConfig>();const [draft,setDraft]=useState({...DEFAULT_WHATSAPP_PREFILL});const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const inputs=useRef<Partial<Record<'zh'|'en',HTMLTextAreaElement|null>>>({});
 const dirty=!!saved&&(saved.zh!==draft.zh||saved.en!==draft.en);
 function fail(e:unknown){if(e instanceof ApiError&&e.status===401)onExpire();setError(e instanceof Error?e.message:L('保存失败，请重试；草稿已保留。','Save failed. Your draft is kept; try again.'));}
 async function load(){try{const result=await api.whatsappPrefill();setSaved(result);setDraft({zh:result.zh,en:result.en});setError('');}catch(e){fail(e);}}
 useEffect(()=>{void load();},[]);
 function insert(lang:'zh'|'en',token:string){const input=inputs.current[lang],start=input?.selectionStart??draft[lang].length,end=input?.selectionEnd??start;setDraft({...draft,[lang]:draft[lang].slice(0,start)+token+draft[lang].slice(end)});setNotice('');requestAnimationFrame(()=>{input?.focus();input?.setSelectionRange(start+token.length,start+token.length);});}
 async function save(){if(!saved)return;if(!validPrefillTemplate(draft.zh)||!validPrefillTemplate(draft.en)){setError(L('请使用纯文本及所列变量，最多500字，不支持网址或HTML。','Use plain text and the listed variables, up to 500 characters. URLs and HTML are not supported.'));return;}setBusy(true);setError('');setNotice('');try{const result=await api.saveWhatsappPrefill({...draft,expectedVersion:saved.version});setSaved(result);setNotice(L('WhatsApp 进线语已保存','WhatsApp greeting saved'));}catch(e){fail(e);}finally{setBusy(false);}}
 return <details className="wa-prefill-editor"><summary>{L('WhatsApp 进线语','WhatsApp chat greeting')}<span>{L('全局 · 客户聊天框预填文字','Global · prefilled chat draft')}</span></summary><div className="wa-prefill-content">
 <p className="admin-subtitle">{L('客户提交后按咨询语言预填，可自行修改再发送。留空表示不预填；不会自动替客户发消息。','Prefills a draft in the enquiry language. Customers can edit and send it themselves. Leave blank for no prefill.')}</p>
 {!saved&&!error&&<p role="status">{L('加载进线语…','Loading greeting…')}</p>}
 <div className="wa-prefill-grid">{(['zh','en'] as const).map(lang=><section key={lang} className="wa-prefill-language"><label className="field">{lang==='zh'?L('中文进线语','Chinese greeting'):L('英文进线语','English greeting')}<textarea ref={el=>{inputs.current[lang]=el;}} rows={3} maxLength={500} disabled={!saved||busy} value={draft[lang]} onChange={e=>{setDraft({...draft,[lang]:e.target.value});setNotice('');}}/></label><div className="wa-prefill-variables" role="group" aria-label={L('插入变量','Insert variable')}>{[{label:L('房屋城市','Property city'),token:lang==='zh'?'{房屋城市}':'{city}'},{label:L('服务类型','Service type'),token:lang==='zh'?'{服务类型}':'{service}'}].map(v=><button type="button" className="btn btn-line" key={v.token} disabled={!saved||busy} onClick={()=>insert(lang,v.token)}>{v.label} <code>{v.token}</code></button>)}</div><p className="wa-prefill-preview-label">{L('虚构预览：墨尔本 · 出租招租','Fictional preview: Melbourne · letting')}</p><p className="wa-prefill-preview">{renderWhatsappPrefill(draft,{city:'Melbourne',service:'letting',language:lang})||L('不预填文字','No prefilled text')}</p></section>)}</div>
 <p className="admin-subtitle">{L('未提供城市或服务时使用通用称呼；过长文字以预览中的截短结果为准。修改仅影响以后新分配，历史链接不变。','Missing context uses general wording. Long text follows the shortened preview. Changes affect new assignments; historical links stay unchanged.')}</p>
 {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="admin-feedback" role="status">{notice}</p>}
 <div className="row-actions">{error&&<button type="button" className="btn btn-line" disabled={busy} onClick={()=>void load()}>{L('重新载入已保存内容','Reload saved content')}</button>}<button type="button" className="btn btn-line" disabled={!saved||busy} onClick={()=>{setDraft({...DEFAULT_WHATSAPP_PREFILL});setNotice('');}}>{L('恢复默认草稿','Use default draft')}</button><button type="button" className="btn btn-primary" disabled={!dirty||busy} onClick={()=>void save()}>{busy?L('保存中…','Saving…'):L('保存进线语','Save greeting')}</button></div>
 </div></details>;
}

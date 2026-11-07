import { setScrollLock } from '../components/ui';
import ReceptionAdmin from './ReceptionAdmin';
import MailAdmin from './MailAdmin';
import {MAIL_STAFF} from '../mail-types';
import { RoutingDetail, RoutingSummary } from '../components/LeadRouting';
import { cloneElement, isValidElement,lazy,Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, LogOut, Plus, RefreshCw, Trash2, Upload, X, LayoutDashboard, Inbox, House, Users, Shuffle, ArrowUpRight, UserRound } from 'lucide-react';
import '../admin.css';
import '../admin-redesign.css';
import {
  api,
  ApiError,
  type Lead,
  type LeadStatus,
  type MovingStatus,
  type Property,
  type PropertyEvent,
  type PropertyInput,
  type Role,
  type Stats,
  type User,
} from '../api';
import { LangToggle, Logo } from '../components/Layout';
import { EmptyState, ErrorState, useAsync } from '../components/parts';
import { cityName, formatDate, leadStatusLabel, money, movingLabel, roleLabel, serviceLabel, statusLabel, typeLabel, useConfig, useI18n } from '../i18n';
import { ADVISORS, CONTACT_METHODS, findAdvisor, PUBLIC_SERVICES, SERVICE_GROUPS, serviceGroup, START_TIMES } from '../enquiry-options';

type Tab = 'overview' | 'leads' | 'properties' | 'team' | 'reception' | 'mail' | 'rental-registrations' | 'registrations';
const RentalRegistrationAdmin=lazy(()=>import('./RentalRegistrationAdmin'));
const CustomerRegistrationsAdmin=lazy(()=>import('./CustomerRegistrationsAdmin'));

export default function Admin() {
  const { L, lang } = useI18n();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const loc = useLocation();
  const navigate = useNavigate();
  const seg = loc.pathname.replace(/^\/admin\/?/, '').split('/')[0];
  const tab: Tab = user?.role==='mail'?'mail':seg === 'leads' || seg === 'properties' || seg === 'team' || seg === 'reception' || seg === 'mail' || seg==='rental-registrations' || seg==='registrations' ? seg : 'overview';
  const setTab = (t: Tab) => navigate(t === 'overview' ? '/admin' : `/admin/${t}`);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = L('團隊後台', 'Team console');
    api
      .session()
      .then((r) => setUser(r.user))
      .catch((e: Error) => {
        setErr(e.message);
        setUser(null);
      });
  }, [L]);

  const expire = useCallback(() => setUser(null), []);

  if (user === undefined) return <div className="admin-center"><p>{L('正在加載…', 'Loading…')}</p></div>;
  if (!user) return <Login onDone={setUser} initialError={err} />;

  const tabs: [Tab, string][] = user.role==='mail'?[]:[
    ['overview', L('概覽', 'Overview')],
    ['leads', L('查詢', 'Enquiries')],
    ['registrations', L('客戶需求登記','Customer registrations')],
    ['properties', L('樓盤', 'Properties')],
  ];
  if (user.role === 'admin') tabs.push(['team', L('團隊帳戶', 'Team')], ['reception', L('渠道分流', 'Channel routing')]);
  if(user.role==='admin'||MAIL_STAFF.some(s=>s.email===user.email))tabs.push(['mail',L('客戶郵件','Customer mail')]);

  const tabIcons={overview:LayoutDashboard,leads:Inbox,properties:House,team:Users,reception:Shuffle,mail:Inbox,'rental-registrations':Inbox,registrations:Inbox};
  const currentTitle=tabs.find(([key])=>key===tab)?.[1]||L('團隊後台','Team console');
  return <div className="admin">
    <a className="admin-skip" href="#admin-content">{L('跳到主要內容','Skip to content')}</a>
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/" aria-label={L('返回網站','Back to site')}><Logo/></Link>
      <p className="admin-sidebar-label">{L('團隊工作台','Team workspace')}</p>
      <nav className="admin-tabs" aria-label={L('後台導航','Console')}>{tabs.map(([key,label])=>{const Icon=tabIcons[key];return <button type="button" key={key} className={tab===key?'on':''} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}><Icon size={18} aria-hidden/><span>{label}</span></button>})}</nav>
      <Link to="/" className="admin-backsite">{L('返回網站','Back to site')}<ArrowUpRight size={16} aria-hidden/></Link>
    </aside>
    <div className="admin-workspace">
      <header className="admin-bar"><div className="admin-bar-in">
        <Link className="admin-mobile-brand" to="/" aria-label={L('返回網站','Back to site')}><Logo/></Link>
        <div className="admin-context"><strong>{currentTitle}</strong><span>{user.city?cityName(user.city,lang):L('全部地區','All cities')} · {roleLabelLocal(user.role,L)}</span></div>
        <div className="admin-user"><LangToggle/><details className="admin-account"><summary aria-label={L('帳戶選單','Account menu')}><UserRound size={18} aria-hidden/><span>{user.name}</span></summary><div><strong>{user.name}</strong><p>{roleLabelLocal(user.role,L)}{user.city?' · '+cityName(user.city,lang):''}</p><button type="button" className="btn btn-quiet" onClick={async()=>{await api.logout().catch(()=>null);setUser(null)}}><LogOut size={16} aria-hidden/>{L('退出登入','Sign out')}</button></div></details></div>
      </div></header>
      <main className="admin-body" id="admin-content" tabIndex={-1}>
        {tab==='overview'&&<Overview user={user} onExpire={expire} goto={setTab}/>}
        {tab==='leads'&&<Leads user={user} onExpire={expire}/>}
        {tab==='properties'&&<Properties user={user} onExpire={expire}/>}
        {tab==='reception'&&user.role==='admin'&&<ReceptionAdmin onExpire={expire}/>}
        {tab==='team'&&user.role==='admin'&&<Team onExpire={expire}/>}
        {tab==='mail'&&<MailAdmin user={user} onExpire={expire}/>}
        {tab==='rental-registrations'&&user.role!=='mail'&&<Suspense fallback={<p role="status">{L('正在讀取…','Loading…')}</p>}><RentalRegistrationAdmin user={user} onExpire={expire}/></Suspense>}
        {tab==='registrations'&&user.role!=='mail'&&<Suspense fallback={<p role="status">{L('正在讀取…','Loading…')}</p>}><CustomerRegistrationsAdmin user={user} onExpire={expire}/></Suspense>}
        {['team','reception'].includes(tab)&&user.role!=='admin'&&<div className="admin-card"><h1>{L('此頁面需要管理員權限','Administrator access required')}</h1><p>{L('請使用您有權限的工作頁面。','Use a page available to your role.')}</p><button className="btn btn-line" onClick={()=>setTab('overview')}>{L('返回概覽','Back to overview')}</button></div>}
      </main>
    </div>
  </div>;
}

const roleLabelLocal = (r: Role, L: (zh: string, en: string) => string) => ({ admin: L('管理員', 'Admin'), manager: L('地區負責人', 'City manager'), assistant: L('助理', 'Assistant'),mail:L('郵件接待','Mail agent') })[r];

function useGuard(onExpire: () => void) {
  return useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) onExpire();
      return e instanceof Error ? e.message : String(e);
    },
    [onExpire],
  );
}

function Login({ onDone, initialError }: { onDone: (u: User) => void; initialError: string }) {
  const { L } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError ? L('暫時無法連接，請登入或重試。','Unable to connect. Sign in or try again.') : '');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.login(email.trim(), password);
      onDone(r.user);
    } catch (err) {
      const m = (err as Error).message;
      setError(m === 'network' || /^HTTP/.test(m) ? L('無法連接服務，請稍後重試。', 'Couldn’t reach the service. Try again shortly.') : m);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-center">
      <form className="login-card" onSubmit={submit}>
        <Logo />
        <h1>{L('團隊登入', 'Team sign-in')}</h1>
        <p className="login-intro">{L('管理查詢、樓盤和團隊工作。僅限授權成員。', 'Manage enquiries, properties and team work. Authorised members only.')}</p>
        <div className="field">
          <label htmlFor="a-email">{L('帳戶或電郵', 'Username or email')}</label>
          <input id="a-email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="a-pass">{L('密碼', 'Password')}</label>
          <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? L('正在登入…', 'Signing in…') : L('登入', 'Sign in')}</button>
        <div className="login-foot">
          <LangToggle />
          <Link to="/">{L('返回網站', 'Back to site')}</Link>
        </div>
      </form>
    </div>
  );
}

/* ---------------- overview ---------------- */
function Overview({ user, onExpire, goto }: { user: User; onExpire: () => void; goto: (t: Tab) => void }) {
  const { L, lang } = useI18n();
  const guard = useGuard(onExpire);
  const [notice, setNotice] = useState('');
  const [tick, setTick] = useState(0);
  const stats = useAsync<Stats>(() => api.stats().catch((e) => { guard(e); throw e; }), [tick]);
  const leads = useAsync(() => api.leads().catch((e) => { guard(e); throw e; }), [tick]);
  const s = stats.data;
  const upcoming = useMemo(
    () => (leads.data?.leads || []).filter((l) => l.nextFollowUp && l.status !== 'closed' && l.status !== 'completed').sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1)).slice(0, 6),
    [leads.data],
  );

  async function retry() {
    try {
      const r = await api.retryNotifications();
      setNotice(L(`已重新排隊 ${r.queued} 條通知。`, `${r.queued} notification(s) queued again.`));
      setTick((t) => t + 1);
    } catch (e) {
      setNotice(guard(e));
    }
  }

  return (
    <div className="admin-page">
      <div className="page-title-row"><div><h1>{L('工作概覽', 'Work overview')}</h1><p className="admin-subtitle">{L('先處理待聯繫查詢，再查看跟進安排。', 'Start with enquiries awaiting contact, then review follow-ups.')}</p></div><button type="button" className="btn btn-line" onClick={()=>setTick(t=>t+1)}><RefreshCw size={16} aria-hidden/>{L('刷新','Refresh')}</button></div>
      {stats.error && <ErrorState message={stats.error} retry={()=>setTick(t=>t+1)}/>}{leads.error&&<ErrorState message={leads.error} retry={()=>setTick(t=>t+1)}/>}
      <div className="stat-grid">
        <Stat label={L('查詢總數', 'Total enquiries')} v={s?.totalLeads} />
        <Stat label={L('待聯繫', 'Awaiting contact')} v={s?.newLeads} hot onClick={() => goto('leads')} />
        <Stat label={L('已發佈樓盤', 'Published properties')} v={s?.activeProperties} onClick={() => goto('properties')} />
        <Stat label={L('未送達通知', 'Pending notifications')} v={s?.pendingNotifications} warn={!!s?.pendingNotifications} />
      </div>
      {user.role === 'admin' && !!s?.pendingNotifications && (
        <div className="notice notice-warn">
          <div>
            <strong>{L('有通知尚未送達', 'Some notifications haven’t been delivered')}</strong>
            <p>{L('查詢已安全保存。可重新排隊發送通知，不會生成重複查詢。', 'Enquiries are saved. You can queue the notifications again without creating duplicates.')}</p>
            <button className="btn btn-quiet btn-sm" onClick={retry}><RefreshCw size={14} aria-hidden /> {L('重新排隊', 'Queue again')}</button>
          </div>
        </div>
      )}
      {notice && <p className="fine" role="status">{notice}</p>}
      <section className="admin-card">
        <h2>{L('即將跟進', 'Upcoming follow-ups')}</h2>
        {leads.loading&&!leads.data?<p role="status">{L('正在讀取跟進安排…','Loading follow-ups…')}</p>:upcoming.length ? (
          <ul className="plain-list">
            {upcoming.map((l) => (
              <li key={l.id}>
                <div><strong>{l.name}</strong><span>{cityName(l.city,lang)} · {serviceLabel(l.service,lang)}</span></div><time>{formatDate(l.nextFollowUp,lang)}</time><Link className="btn btn-line" to={'/admin/leads?lead='+encodeURIComponent(l.id)}>{L('查看查詢','View enquiry')}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fine">{L('暫無已設置的跟進日期。', 'No follow-up dates set.')}</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, v, hot, warn, onClick }: { label: string; v?: number; hot?: boolean; warn?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <span className="stat-v">{v ?? '–'}</span>
      <span className="stat-l">{label}</span>
    </>
  );
  return onClick ? <button className={`stat ${hot ? 'hot' : ''}`} onClick={onClick}>{inner}</button> : <div className={`stat ${warn ? 'warn' : ''}`}>{inner}</div>;
}

/* ---------------- leads ---------------- */
const STATUSES: LeadStatus[] = ['new', 'contacted', 'following', 'completed', 'closed'];
const MOVING: MovingStatus[] = ['none', 'requested', 'scheduled', 'completed'];

function Leads({ user, onExpire }: { user: User; onExpire: () => void }) {
  const { L, lang } = useI18n();
  const guard = useGuard(onExpire);
  const [tick, setTick] = useState(0);
  const leads = useAsync(() => api.leads().catch((e) => { guard(e); throw e; }), [tick]);
  const users = useAsync(() => (user.role !== 'assistant' ? api.users().then((r) => r.users) : Promise.resolve([] as User[])), [user.role]);
  const [sp,setSp]=useSearchParams();
  const filter=(['all',...STATUSES].includes(sp.get('status')||'')?sp.get('status'):'all') as 'all'|LeadStatus;
  const q=sp.get('q')||'',groupFilter=sp.get('group')||'',serviceFilter=sp.get('service')||'',advisorFilter=sp.get('advisor')||'',routingFilter=sp.get('routing')||'';
  const changeFilters=(changes:Record<string,string>)=>{const next=new URLSearchParams(sp);for(const [key,value]of Object.entries(changes))value&&value!=='all'?next.set(key,value):next.delete(key);setSp(next,{replace:true})};
  const setQ=(value:string)=>changeFilters({q:value});const setFilter=(value:string)=>changeFilters({status:value});
  const setGroupFilter=(value:string)=>changeFilters({group:value,service:''});const setServiceFilter=(value:string)=>changeFilters({service:value});const setAdvisorFilter=(value:string)=>changeFilters({advisor:value});
  const openId = sp.get('lead');
  const setOpenId = (id: string | null) => {
    const n = new URLSearchParams(sp);
    if (id) n.set('lead', id);
    else n.delete('lead');
    setSp(n, { replace: true });
  };

  const list = (leads.data?.leads || [])
    .filter(lead => !groupFilter || serviceGroup(lead.service) === groupFilter)
    .filter(lead => !serviceFilter || lead.service === serviceFilter)
    .filter(lead=>!routingFilter||lead.routing?.state===routingFilter||lead.routing?.assignments.some(a=>a.channel===routingFilter))
    .filter(lead => !advisorFilter || lead.preferredAdvisorId === advisorFilter)
    .filter((l) => (filter === 'all' ? true : l.status === filter))
    .filter((l) => !q || [l.name, l.contact, l.propertyAddress, l.message, l.needSummary, findAdvisor(l.preferredAdvisorId)?.name].some((x) => x?.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = list.find((l) => l.id === openId) || (leads.data?.leads || []).find((l) => l.id === openId) || null;
  const userName = (id: string | null) => (id ? users.data?.find((u) => u.id === id)?.name || id : L('未分配', 'Unassigned'));

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>{L('查詢', 'Enquiries')}</h1>
        <div className="row-actions">
          <button className="btn btn-quiet btn-sm" onClick={() => setTick(tick + 1)}><RefreshCw size={14} aria-hidden /> {L('刷新', 'Refresh')}</button>
          <a className="btn btn-quiet btn-sm" href="/api/admin/export/leads"><Download size={14} aria-hidden /> {L('導出 CSV', 'Export CSV')}</a>
        </div>
      </div>
      <div className="admin-filters admin-lead-filters">
        <input type="search" placeholder={L('搜尋姓名、聯繫方式、地址', 'Search name, contact, address')} aria-label={L('搜尋', 'Search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <label>{L('服務分組', 'Service group')}<select aria-label={L('服務分組', 'Service group')} value={groupFilter} onChange={event=>setGroupFilter(event.target.value)}><option value="">{L('全部分組', 'All groups')}</option>{Object.entries(SERVICE_GROUPS).map(([value, label]) => <option value={value} key={value}>{L(label.zh, label.en)}</option>)}</select></label>
        <label>{L('服務類型', 'Service type')}<select aria-label={L('服務類型', 'Service type')} value={serviceFilter} onChange={event => setServiceFilter(event.target.value)}><option value="">{L('全部服務', 'All services')}</option>{PUBLIC_SERVICES.filter(service => !groupFilter || serviceGroup(service) === groupFilter).map(service => <option value={service} key={service}>{serviceLabel(service, lang)}</option>)}</select></label>
        <label>{L('指定顧問', 'Preferred advisor')}<select aria-label={L('指定顧問', 'Preferred advisor')} value={advisorFilter} onChange={event => setAdvisorFilter(event.target.value)}><option value="">{L('全部顧問', 'All advisors')}</option>{ADVISORS.map(advisor => <option value={advisor.id} key={advisor.id}>{advisor.name}</option>)}</select></label>
        <label>{L('分流狀態/渠道','Routing status/channel')}<select value={routingFilter} onChange={e=>changeFilters({routing:e.target.value})}><option value="">{L('全部','All')}</option>{['assigned','no_city_match','awaiting_assignment','whatsapp','wechat','phone_callback'].map(value=><option key={value} value={value}>{({assigned:L('已分配','Assigned'),no_city_match:L('地區無匹配','No city match'),awaiting_assignment:L('待分配','Awaiting assignment'),whatsapp:'WhatsApp',wechat:L('微信','WeChat'),phone_callback:L('電話回訪','Phone callback')} as Record<string,string>)[value]}</option>)}</select></label>
        <div className="chips">
          {(['all', ...STATUSES] as const).map((s) => (
            <button key={s} className={filter === s ? 'on' : ''} aria-pressed={filter===s} onClick={() => setFilter(s)}>
              {s === 'all' ? L('全部', 'All') : leadStatusLabel(s, lang)}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-results" role="status"><span>{L(`共 ${list.length} 條查詢`,`${list.length} enquiries`)}</span>{(q||filter!=='all'||groupFilter||serviceFilter||advisorFilter||routingFilter)&&<button type="button" className="btn btn-quiet" onClick={()=>changeFilters({q:'',status:'',group:'',service:'',advisor:'',routing:''})}>{L('清除篩選','Clear filters')}</button>}</div>
      {leads.error && <ErrorState message={leads.error} retry={() => setTick(tick + 1)} />}
      {leads.loading && !leads.data ? (
        <div className="skeleton-row tall" aria-busy />
      ) : list.length === 0 ? (
        <EmptyState title={leads.data?.leads.length ? L('沒有符合條件的查詢', 'No enquiries match') : L('還沒有查詢', 'No enquiries yet')}>
          <p>{L('網站表單提交後會出現在這裏。', 'Submissions from the website form will appear here.')}</p>
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table lead-table">
            <thead>
              <tr>
                <th>{L('時間', 'Received')}</th>
                <th>{L('姓名', 'Name')}</th>
                <th>{L('地區', 'City')}</th>
                <th>{L('服務', 'Service')}</th>
                <th>{L('指定顧問', 'Preferred advisor')}</th>
                <th>{L('狀態', 'Status')}</th>
                <th>{L('負責人', 'Owner')}</th><th>{L('操作','Action')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className={openId === l.id ? 'on' : ''} onClick={() => setOpenId(l.id)}>
                  <td className="lead-date" data-l={L('時間', 'Received')}>{formatDate(l.createdAt, lang)}</td>
                  <td className="record-primary" data-l={L('姓名','Name')}><strong>{l.name}</strong><small>{l.contact}</small><small className="lead-meta">{formatDate(l.createdAt, lang)} · {cityName(l.city, lang)} · {serviceLabel(l.service, lang)}</small><RoutingSummary routing={l.routing} /></td>
                  <td className="lead-city" data-l={L('地區', 'City')}>{cityName(l.city, lang)}</td>
                  <td className="lead-service" data-l={L('服務', 'Service')}>{serviceLabel(l.service, lang)}</td>
                  <td className="lead-advisor" data-l={L('指定顧問', 'Preferred advisor')}>{findAdvisor(l.preferredAdvisorId)?.name || '—'}</td>
                  <td className="lead-status" data-l={L('狀態', 'Status')}><span className={`pill st-${l.status}`}>{leadStatusLabel(l.status, lang)}</span></td>
                  <td className="lead-owner" data-l={L('負責人', 'Owner')}>{userName(l.assignedTo)}</td><td className="record-action"><button type="button" className="btn btn-line" onClick={e=>{e.stopPropagation();setOpenId(l.id)}}>{L('查看與跟進','View & follow up')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <LeadPanel
          key={open.id}
          lead={open}
          user={user}
          users={users.data || []}
          onClose={() => setOpenId(null)}
          onSaved={() => setTick((t) => t + 1)}
          guard={guard}
        />
      )}
    </div>
  );
}

function LeadPanel({ lead, user, users, onClose, onSaved, guard }: { lead: Lead; user: User; users: User[]; onClose: () => void; onSaved: () => void; guard: (e: unknown) => string }) {
  const { L, lang } = useI18n();
  const [f, setF] = useState({
    status: lead.status,
    assignedTo: lead.assignedTo || '',
    notes: lead.notes || '',
    nextFollowUp: (lead.nextFollowUp || '').slice(0, 10),
    commissionOrdinal: lead.commissionOrdinal == null ? '' : String(lead.commissionOrdinal),
    movingStatus: lead.movingStatus,
  });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=dialogRef.current,trigger=document.activeElement as HTMLElement;el?.showModal();setScrollLock('admin-lead',true);return()=>{el?.close();setScrollLock('admin-lead',false);trigger?.focus({preventScroll:true})}},[]);
  const canAssign = user.role === 'admin' || user.role === 'manager';

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      const body: Parameters<typeof api.patchLead>[1] = {
        status: f.status,
        notes: f.notes,
        nextFollowUp: f.nextFollowUp || null,
        commissionOrdinal: f.commissionOrdinal === '' ? null : Number(f.commissionOrdinal),
        movingStatus: f.movingStatus,
      };
      if (canAssign) body.assignedTo = f.assignedTo || null;
      await api.patchLead(lead.id, body);
      setMsg(L('已保存', 'Saved'));
      onSaved();
    } catch (e) {
      setMsg(guard(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog className="drawer" ref={dialogRef} aria-label={lead.name} onCancel={event=>{event.preventDefault();onClose()}}>
      <div className="drawer-head">
        <h2>{lead.name}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={L('關閉', 'Close')}><X size={20} /></button>
      </div>
<div className="lead-contact-summary"><strong>{lead.contact}</strong><span>{cityName(lead.city,lang)} · {serviceLabel(lead.service,lang)}</span></div>
      <RoutingDetail routing={lead.routing} />
      <p className="fine">{L('接粉人員','Responsible staff')}：{lead.receptionRecipient||L('待分配','Awaiting assignment')}</p>
      <details className="admin-details lead-record-details"><summary>{L('查詢原始資料','Enquiry details')}</summary><dl className="kv">
        <dt>{L('聯繫方式', 'Contact')}</dt><dd className="mono">{lead.contact}</dd>
        {lead.contactMethod && <><dt>{L('聯繫方法', 'Contact method')}</dt><dd>{L(CONTACT_METHODS[lead.contactMethod].zh, CONTACT_METHODS[lead.contactMethod].en)}</dd></>}
        <dt>{L('地區／服務', 'City / service')}</dt><dd>{cityName(lead.city, lang)} · {serviceLabel(lead.service, lang)}</dd>
        <dt>{L('服務分組', 'Service group')}</dt><dd>{L(SERVICE_GROUPS[serviceGroup(lead.service)].zh, SERVICE_GROUPS[serviceGroup(lead.service)].en)}</dd>
        {findAdvisor(lead.preferredAdvisorId) && <><dt>{L('指定顧問', 'Preferred advisor')}</dt><dd>{findAdvisor(lead.preferredAdvisorId)!.name}</dd></>}
        {lead.propertyType && <><dt>{L('房屋類型', 'Property type')}</dt><dd>{lead.propertyType === 'other' ? L('其他', 'Other') : typeLabel(lead.propertyType, lang)}</dd></>}
        {lead.bedrooms != null && <><dt>{L('卧室數', 'Bedrooms')}</dt><dd>{lead.bedrooms}</dd></>}
        {lead.offerInterest !== undefined && <><dt>{L('查詢限時優惠', 'Interested in the offer')}</dt><dd>{lead.offerInterest ? L('是', 'Yes') : L('否', 'No')}</dd></>}
        {lead.needSummary && <><dt>{L('需求簡述', 'What needs doing')}</dt><dd>{lead.needSummary}</dd></>}
        {lead.startTime && <><dt>{L('希望開始時間', 'Preferred start')}</dt><dd>{L(START_TIMES[lead.startTime].zh, START_TIMES[lead.startTime].en)}</dd></>}
        {lead.budgetRange && <><dt>{L('預算區間', 'Budget range')}</dt><dd>{lead.budgetRange}</dd></>}
        {lead.saleTime && <><dt>{L('預計出售時間', 'Expected sale time')}</dt><dd>{lead.saleTime}</dd></>}
        <dt>{L('語言', 'Language')}</dt><dd>{lead.language === 'zh' ? '中文' : 'English'}</dd>
        <dt>{L('收到時間', 'Received')}</dt><dd>{formatDate(lead.createdAt, lang)}</dd>
        {lead.propertyAddress && (<><dt>{L('關聯房產', 'Property')}</dt><dd>{lead.propertyId ? <Link to={`/properties/${lead.propertyId}`} target="_blank">{lead.propertyAddress}</Link> : lead.propertyAddress}</dd></>)}
        {lead.listingId && <><dt>{L('關聯睇樓樣品', 'Viewing sample')}</dt><dd><Link to={`/viewings?listing=${lead.listingId}`} target="_blank" rel="noopener noreferrer">{lead.listingId}</Link></dd></>}
        {lead.message && (<><dt>{L('留言', 'Message')}</dt><dd className="pre">{lead.message}</dd></>)}
        <dt>{L('是否由其他代理管理', 'With another agency')}</dt>
        <dd>{lead.currentlyManaged === true ? L('是', 'Yes') : lead.currentlyManaged === false ? L('否', 'No') : L('待確認', 'To be confirmed')}</dd>
        <dt>{L('通知', 'Notification')}</dt><dd>{lead.notificationStatus}{lead.notificationSyncStatus&&<> · {L('分流同步','Routing sync')}: {lead.notificationSyncStatus}</>}</dd>
        <dt>Signal</dt><dd>{lead.signalNotification ? <>{lead.signalNotification.status} · {L('分流同步','Routing sync')}: {lead.signalNotification.syncStatus}{lead.signalNotification.sentAt&&<> · {formatDate(lead.signalNotification.sentAt,lang)}</>}{lead.signalNotification.error&&<> · {lead.signalNotification.error}</>}</> : L('此查詢未啓用 Signal 通知','Signal was not enabled for this enquiry')}</dd>
      </dl></details>
      <h3 className="admin-section-label">{L('跟進安排','Follow-up')}</h3><div className="field-grid">
        <Field label={L('狀態', 'Status')}>
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as LeadStatus })}>
            {STATUSES.map((s) => <option key={s} value={s}>{leadStatusLabel(s, lang)}</option>)}
          </select>
        </Field>
        <Field label={L('負責人', 'Assigned to')}>
          {canAssign ? (
            <select value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })}>
              <option value="">{L('未分配', 'Unassigned')}</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.city ? ` (${cityName(u.city, lang)})` : ''}</option>)}
            </select>
          ) : (
            <input disabled value={lead.assignedTo || L('未分配', 'Unassigned')} readOnly />
          )}
        </Field>
        <Field label={L('下次跟進', 'Next follow-up')}>
          <input type="date" value={f.nextFollowUp} onChange={(e) => setF({ ...f, nextFollowUp: e.target.value })} />
        </Field>
        <Field label={L('業主第幾單（優惠順序）', 'Owner’s Nth appointment (offer order)')}>
          <input type="number" min={1} value={f.commissionOrdinal} onChange={(e) => setF({ ...f, commissionOrdinal: e.target.value })} />
        </Field>
        <Field label={L('搬屋服務', 'Moving service')}>
          <select value={f.movingStatus} onChange={(e) => setF({ ...f, movingStatus: e.target.value as MovingStatus })}>
            {MOVING.map((s) => <option key={s} value={s}>{movingLabel(s, lang)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={L('跟進備註', 'Notes')}>
        <textarea rows={5} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </Field>
      <div className="row-actions drawer-actions">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? L('保存中…', 'Saving…') : L('保存', 'Save')}</button>
        {msg && <span className="fine" role="status">{msg}</span>}
      </div>
    </dialog>
  );
}

/* ---------------- properties ---------------- */
const emptyProperty = (city: string): PropertyInput => ({
  title: { zh: '', en: '' },
  description: { zh: '', en: '' },
  address: '',
  city,
  suburb: '',
  postcode: '',
  type: 'house',
  status: 'sale',
  price: null,
  priceLabel: { zh: '', en: '' },
  beds: 0,
  baths: 0,
  cars: 0,
  area: null,
  images: [],
  floorplan: '',
  tourUrl: '',
  tourKind: 'none',
  published: false,
  events: [],
});

function Properties({ user, onExpire }: { user: User; onExpire: () => void }) {
  const { L, pick, lang } = useI18n();
  const { config } = useConfig();
  const guard = useGuard(onExpire);
  const [tick, setTick] = useState(0);
  const list = useAsync(() => api.adminProperties().catch((e) => { guard(e); throw e; }), [tick]);
  const [editing, setEditing] = useState<Property | 'new' | null>(null);
  const canEdit = user.role !== 'assistant';
  const [propertySearch,setPropertySearch]=useState('');const [propertyStatus,setPropertyStatus]=useState('');const [publication,setPublication]=useState('');
  const filtered=(list.data?.properties||[]).filter(p=>(!propertySearch||[p.title.zh,p.title.en,p.address,p.city].join(' ').toLowerCase().includes(propertySearch.toLowerCase()))&&(!propertyStatus||p.status===propertyStatus)&&(!publication||String(p.published)===(publication==='live'?'true':'false')));

  if (editing)
    return (
      <PropertyEditor
        initial={editing === 'new' ? emptyProperty(user.city || config.cities[0] || '') : editing}
        id={editing === 'new' ? null : editing.id}
        guard={guard}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setTick((t) => t + 1);
        }}
      />
    );

  return (
    <div className="admin-page">
      <div className="page-title-row">
        <h1>{L('樓盤', 'Properties')}</h1>
        {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><Plus size={15} aria-hidden /> {L('新增樓盤', 'Add property')}</button>}
      </div>
      <div className="admin-filters"><input type="search" aria-label={L('搜尋樓盤','Search properties')} placeholder={L('搜尋地址、標題或地區','Search address, title or city')} value={propertySearch} onChange={e=>setPropertySearch(e.target.value)}/><label>{L('樓盤狀態','Property status')}<select value={propertyStatus} onChange={e=>setPropertyStatus(e.target.value)}><option value="">{L('全部狀態','All statuses')}</option>{(['sale','rent','sold','leased'] as const).map(s=><option value={s} key={s}>{statusLabel(s,lang)}</option>)}</select></label><label>{L('發佈','Publication')}<select value={publication} onChange={e=>setPublication(e.target.value)}><option value="">{L('全部','All')}</option><option value="live">{L('已發佈','Live')}</option><option value="draft">{L('草稿','Draft')}</option></select></label></div><div className="admin-results" role="status"><span>{L(`共 ${filtered.length} 套`,`${filtered.length} properties`)}</span>{(propertySearch||propertyStatus||publication)&&<button className="btn btn-quiet" onClick={()=>{setPropertySearch('');setPropertyStatus('');setPublication('')}}>{L('清除篩選','Clear filters')}</button>}</div>
      {list.error && <ErrorState message={list.error} retry={() => setTick(tick + 1)} />}
      {list.loading && !list.data ? <div className="skeleton-row tall" aria-busy /> : list.data && filtered.length === 0 ? (
        <EmptyState title={list.data.properties.length?L('沒有符合條件的樓盤','No matching properties'):L('還沒有樓盤','No properties yet')}>
          <p>{L('網站上的樓盤和歷史案例都來自這裏，不會顯示示例數據。先錄入第一套真實樓盤。', 'Everything on the site’s listings and history pages comes from here — no sample data. Add the first real property.')}</p>
          {canEdit && <button className="btn btn-primary" onClick={() => setEditing('new')}>{L('新增樓盤', 'Add property')}</button>}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table property-table">
            <thead>
              <tr><th>{L('樓盤', 'Property')}</th><th>{L('地區', 'City')}</th><th>{L('狀態', 'Status')}</th><th>{L('價格', 'Price')}</th><th>{L('發佈', 'Published')}</th>{canEdit&&<th>{L('操作','Action')}</th>}</tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => canEdit && setEditing(p)}>
                  <td className="record-primary" data-l={L('樓盤', 'Property')}><strong>{pick(p.title) || p.address}</strong><br /><small>{p.address}</small></td>
                  <td data-l={L('地區', 'City')}>{cityName(p.city, lang)}</td>
                  <td data-l={L('狀態', 'Status')}>{statusLabel(p.status, lang)} · {typeLabel(p.type, lang)}</td>
                  <td data-l={L('價格', 'Price')}>{pick(p.priceLabel) || money(p.price) || '–'}</td>
                  <td data-l={L('發佈', 'Published')}><span className={`pill ${p.published ? 'st-completed' : 'st-new'}`}>{p.published ? L('已發佈', 'Live') : L('草稿', 'Draft')}</span></td>{canEdit&&<td className="record-action"><button type="button" className="btn btn-line" onClick={e=>{e.stopPropagation();setEditing(p)}}>{L('編輯樓盤','Edit property')}</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  const id = useId();
  return (
    <div className={`field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}
    </div>
  );
}

function PropertyEditor({ initial, id, onCancel, onSaved, guard }: { initial: PropertyInput; id: string | null; onCancel: () => void; onSaved: () => void; guard: (e: unknown) => string }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const [p, setP] = useState<PropertyInput>(() => ({ ...emptyProperty(''), ...initial }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const set = <K extends keyof PropertyInput>(k: K, v: PropertyInput[K]) => setP((o) => ({ ...o, [k]: v }));
  const num = (v: string) => (v === '' ? null : Number(v));

  async function upload(files: FileList | null, target: 'images' | 'floorplan') {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 8 * 1024 * 1024) throw new Error(L(`${f.name} 超過 8MB`, `${f.name} is over 8 MB`));
        urls.push((await api.upload(f)).url);
      }
      if (target === 'images') set('images', [...p.images, ...urls]);
      else set('floorplan', urls[0]);
    } catch (e) {
      setError(guard(e));
    } finally {
      setUploading(false);
    }
  }

  const addEvent = () => set('events', [...p.events, { date: new Date().toISOString().slice(0, 10), type: 'listed', price: null, note: { zh: '', en: '' } }]);
  const patchEvent = (i: number, v: Partial<PropertyEvent>) => set('events', p.events.map((e, k) => (k === i ? { ...e, ...v } : e)));

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!p.address.trim() || !p.city) return setError(L('請填寫地址並選擇地區', 'Enter an address and choose a city'));
    if (!p.title.zh.trim() && !p.title.en.trim()) return setError(L('至少填寫一種語言的標題', 'Enter a title in at least one language'));
    if (p.tourUrl && !/^https:\/\//i.test(p.tourUrl)) return setError(L('3D 連結必須以 https:// 開頭', 'The tour link must start with https://'));
    if (p.tourUrl && p.tourKind === 'none') return setError(L('請選擇導覽類型（實拍或示意）', 'Choose the tour type (real or illustrative)'));
    const body: PropertyInput = { ...p, tourKind: p.tourUrl ? p.tourKind : 'none' };
    setBusy(true);
    try {
      if (id) await api.updateProperty(id, body);
      else await api.createProperty(body);
      onSaved();
    } catch (err) {
      setError(guard(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-page editor" onSubmit={save}>
      <div className="page-title-row editor-toolbar">
        <h1>{id ? L('編輯樓盤', 'Edit property') : L('新增樓盤', 'Add property')}</h1>
        <div className="row-actions">
          <button type="button" className="btn btn-quiet" onClick={onCancel}>{L('返回列表', 'Back to list')}</button>
          <button className="btn btn-primary" disabled={busy || uploading}>{busy ? L('保存中…', 'Saving…') : L('保存', 'Save')}</button>
        </div>
      </div>
      {error && <div className="notice notice-error" role="alert"><p>{error}</p></div>}

      <fieldset className="admin-card">
        <legend>{L('基本資料', 'Basics')}</legend>
        <div className="field-grid">
          <Field label={L('標題（中文）', 'Title (Chinese)')}><input value={p.title.zh} onChange={(e) => set('title', { ...p.title, zh: e.target.value })} /></Field>
          <Field label={L('標題（英文）', 'Title (English)')}><input value={p.title.en} onChange={(e) => set('title', { ...p.title, en: e.target.value })} /></Field>
          <Field label={L('街道地址', 'Street address')}><input value={p.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label={L('地區', 'City')}>
            <select value={p.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">{L('請選擇', 'Select')}</option>
              {config.cities.map((c) => <option key={c} value={c}>{cityName(c, lang)}</option>)}
            </select>
          </Field>
          <Field label={L('區域', 'Suburb')}><input value={p.suburb} onChange={(e) => set('suburb', e.target.value)} /></Field>
          <Field label={L('郵編', 'Postcode')}><input inputMode="numeric" value={p.postcode} onChange={(e) => set('postcode', e.target.value)} /></Field>
          <Field label={L('類型', 'Type')}>
            <select value={p.type} onChange={(e) => set('type', e.target.value as PropertyInput['type'])}>
              {(['house', 'apartment', 'townhouse', 'land'] as const).map((t) => <option key={t} value={t}>{typeLabel(t, lang)}</option>)}
            </select>
          </Field>
          <Field label={L('狀態', 'Status')}>
            <select value={p.status} onChange={(e) => set('status', e.target.value as PropertyInput['status'])}>
              {(['sale', 'rent', 'sold', 'leased'] as const).map((s) => <option key={s} value={s}>{statusLabel(s, lang)}</option>)}
            </select>
          </Field>
          <Field label={L('價格 (HK$，租金為每月)', 'Price (HK$, rent per month)')}><input type="number" min={0} value={p.price ?? ''} onChange={(e) => set('price', num(e.target.value))} /></Field>
          <Field label={L('價格展示（中文，選填）', 'Price display (Chinese, optional)')}><input value={p.priceLabel.zh} onChange={(e) => set('priceLabel', { ...p.priceLabel, zh: e.target.value })} /></Field>
          <Field label={L('價格展示（英文，選填）', 'Price display (English, optional)')}><input value={p.priceLabel.en} onChange={(e) => set('priceLabel', { ...p.priceLabel, en: e.target.value })} /></Field>
          <Field label={L('面積 (m²)', 'Area (m²)')}><input type="number" min={0} value={p.area ?? ''} onChange={(e) => set('area', num(e.target.value))} /></Field>
          <Field label={L('卧室', 'Bedrooms')}><input type="number" min={0} value={p.beds} onChange={(e) => set('beds', Number(e.target.value))} /></Field>
          <Field label={L('衞浴', 'Bathrooms')}><input type="number" min={0} value={p.baths} onChange={(e) => set('baths', Number(e.target.value))} /></Field>
          <Field label={L('車位', 'Car spaces')}><input type="number" min={0} value={p.cars} onChange={(e) => set('cars', Number(e.target.value))} /></Field>
        </div>
        <div className="field-grid">
          <Field label={L('介紹（中文）', 'Description (Chinese)')}><textarea rows={5} value={p.description.zh} onChange={(e) => set('description', { ...p.description, zh: e.target.value })} /></Field>
          <Field label={L('介紹（英文）', 'Description (English)')}><textarea rows={5} value={p.description.en} onChange={(e) => set('description', { ...p.description, en: e.target.value })} /></Field>
        </div>
        <p className="fine">{L('某種語言尚未翻譯時，前台會顯示另一種語言的內容。', 'If one language isn’t translated yet, the site shows the other.')}</p>
      </fieldset>

      <fieldset className="admin-card">
        <legend>{L('圖片與戶型圖', 'Photos and floor plan')}</legend>
        <ul className="img-list">
          {p.images.map((u, i) => (
            <li key={u + i}>
              <img src={u} alt="" />
              <div>
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => { const a = [...p.images]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set('images', a); }} aria-label={L('前移', 'Move earlier')}>↑</button>
                <button type="button" className="icon-btn" onClick={() => set('images', p.images.filter((_, k) => k !== i))} aria-label={L('移除', 'Remove')}><Trash2 size={16} /></button>
              </div>
              {i === 0 && <small>{L('封面', 'Cover')}</small>}
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <label className="btn btn-quiet btn-sm file-btn">
            <Upload size={15} aria-hidden /> {uploading ? L('上傳中…', 'Uploading…') : L('上傳圖片 (JPEG/PNG/WebP, ≤8MB)', 'Upload photos (JPEG/PNG/WebP, ≤8 MB)')}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { upload(e.target.files, 'images'); e.target.value = ''; }} />
          </label>
          <input className="inline-input" placeholder={L('或粘貼 HTTPS 圖片連結', 'Or paste an HTTPS image URL')} value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} />
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => { if (/^https:\/\//i.test(imgUrl)) { set('images', [...p.images, imgUrl]); setImgUrl(''); } else setError(L('圖片連結必須以 https:// 開頭', 'Image URLs must start with https://')); }}>
            {L('添加', 'Add')}
          </button>
        </div>
        <div className="field">
          <label htmlFor="fp-url">{L('戶型圖', 'Floor plan')}</label>
          <div className="row-actions">
            {p.floorplan && <img className="fp-thumb" src={p.floorplan} alt="" />}
            <label className="btn btn-quiet btn-sm file-btn">
              <Upload size={15} aria-hidden /> {L('上傳戶型圖', 'Upload floor plan')}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload(e.target.files, 'floorplan'); e.target.value = ''; }} />
            </label>
            <input id="fp-url" className="inline-input" placeholder="https://…" value={p.floorplan} onChange={(e) => set('floorplan', e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-card">
        <legend>{L('3D 導覽', '3D tour')}</legend>
        <div className="field-grid">
          <Field label={L('導覽連結（僅 HTTPS）', 'Tour link (HTTPS only)')}><input value={p.tourUrl} onChange={(e) => set('tourUrl', e.target.value)} placeholder="https://" /></Field>
          <Field label={L('導覽類型', 'Tour type')}>
            <select value={p.tourKind} onChange={(e) => set('tourKind', e.target.value as PropertyInput['tourKind'])}>
              <option value="none">{L('無', 'None')}</option>
              <option value="real">{L('實拍／掃描', 'Real capture or scan')}</option>
              <option value="illustration">{L('示意（AI／非實拍）', 'Illustrative (AI / not captured)')}</option>
            </select>
          </Field>
        </div>
        <p className="fine">{L('示意類型會在前台明確標註“非實拍”。連結須在服務器許可名單內才會顯示。', 'Illustrative tours are labelled “not a real capture” on the site. Links must be on the server’s allow-list to display.')}</p>
      </fieldset>

      <fieldset className="admin-card">
        <legend>{L('歷史事件', 'History events')}</legend>
        {p.events.length === 0 && <p className="fine">{L('尚無記錄。只錄入有資料來源的掛牌、調價和成交。', 'No records yet. Only enter listings, price changes and results you can source.')}</p>}
        {p.events.map((ev, i) => (
          <div className="event-row" key={ev.id || i}>
            <input type="date" aria-label={L('日期', 'Date')} value={ev.date.slice(0, 10)} onChange={(e) => patchEvent(i, { date: e.target.value })} />
            <select aria-label={L('類型', 'Type')} value={ev.type} onChange={(e) => patchEvent(i, { type: e.target.value as PropertyEvent['type'] })}>
              <option value="listed">{L('掛牌', 'Listed')}</option>
              <option value="price_changed">{L('調價', 'Price change')}</option>
              <option value="sold">{L('成交', 'Sold')}</option>
              <option value="leased">{L('出租成交', 'Leased')}</option>
            </select>
            <input type="number" min={0} placeholder="HK$" aria-label={L('價格', 'Price')} value={ev.price ?? ''} onChange={(e) => patchEvent(i, { price: num(e.target.value) })} />
            <input placeholder={L('備註（中文）', 'Note (Chinese)')} value={ev.note.zh} onChange={(e) => patchEvent(i, { note: { ...ev.note, zh: e.target.value } })} />
            <input placeholder={L('備註（英文）', 'Note (English)')} value={ev.note.en} onChange={(e) => patchEvent(i, { note: { ...ev.note, en: e.target.value } })} />
            <button type="button" className="icon-btn" onClick={() => set('events', p.events.filter((_, k) => k !== i))} aria-label={L('刪除事件', 'Delete event')}><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-quiet btn-sm" onClick={addEvent}><Plus size={14} aria-hidden /> {L('添加事件', 'Add event')}</button>
      </fieldset>

      <fieldset className="admin-card">
        <legend>{L('發佈', 'Publishing')}</legend>
        <label className="check">
          <input type="checkbox" checked={p.published} onChange={(e) => set('published', e.target.checked)} />
          <span>{L('在網站上公開顯示此樓盤', 'Show this property publicly on the website')}</span>
        </label>
        <p className="fine">{L('發佈前請核對價格、地址、成交資料和照片。演示數據不得作為真實成交發布。', 'Check price, address, result details and photos before publishing. Demo data must never be published as a real result.')}</p>
      </fieldset>
    </form>
  );
}

/* ---------------- team ---------------- */
function Team({ onExpire }: { onExpire: () => void }) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const guard = useGuard(onExpire);
  const [tick, setTick] = useState(0);
  const users = useAsync(() => api.users().then((r) => r.users).catch((e) => { guard(e); throw e; }), [tick]);
  const [showCreate,setShowCreate]=useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'assistant' as Role, city: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (f.password.length < 12) return setMsg(L('密碼至少 12 位', 'Password must be at least 12 characters'));
    setBusy(true);
    try {
      await api.createUser({ name: f.name.trim(), email: f.email.trim(), password: f.password, role: f.role, city: f.city || undefined });
      setF({ name: '', email: '', password: '', role: 'assistant', city: '' });
      setMsg(L('帳戶已創建', 'Account created'));setShowCreate(false);
      setTick((t) => t + 1);
    } catch (err) {
      setMsg(guard(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-title-row"><div><h1>{L('團隊帳戶','Team accounts')}</h1><p className="admin-subtitle">{L('按角色和地區範圍授權，不改變現有權限。','Access follows the existing role and city permissions.')}</p></div><button type="button" className="btn btn-primary" onClick={()=>setShowCreate(true)}><Plus size={16} aria-hidden/>{L('新增帳戶','Add account')}</button></div>{msg&&<p className="admin-feedback" role="status">{msg}</p>}
      {users.error && <ErrorState message={users.error} retry={() => setTick(tick + 1)} />}
      <div className="table-wrap">
        <table className="table static">
          <thead><tr><th>{L('姓名', 'Name')}</th><th>{L('電郵', 'Email')}</th><th>{L('角色', 'Role')}</th><th>{L('地區', 'City')}</th></tr></thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id}>
                <td data-l={L('姓名', 'Name')}><strong>{u.name}</strong></td>
                <td data-l={L('電郵', 'Email')}>{u.email}</td>
                <td data-l={L('角色', 'Role')}>{roleLabel(u.role, lang)}</td>
                <td data-l={L('地區', 'City')}>{u.city ? cityName(u.city, lang) : L('全部', 'All')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreate&&<form className="admin-card account-editor" onSubmit={submit}>
        <div className="page-title-row"><h2>{L('新增帳戶','Add an account')}</h2><button type="button" className="btn btn-quiet" onClick={()=>{setShowCreate(false);setF(previous=>({...previous,password:''}))}}>{L('取消','Cancel')}</button></div>
        <div className="field-grid">
          <Field label={L('姓名', 'Name')}><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label={L('電郵', 'Email')}><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label={L('初始密碼（至少 12 位）', 'Initial password (12+ characters)')}><input type="password" autoComplete="new-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label={L('角色', 'Role')}>
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(['assistant', 'manager', 'mail', 'admin'] as const).map((r) => <option key={r} value={r}>{roleLabel(r, lang)}</option>)}
            </select>
          </Field>
          <Field label={L('負責地區', 'City')}>
            <select required={!['admin','mail'].includes(f.role)} disabled={['admin','mail'].includes(f.role)} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>
              <option value="">{f.role==='mail'?L('按郵件歸屬','Assigned mail'):f.role==='admin'?L('全部地區','All cities'):L('請選擇負責地區','Choose a city')}</option>
              {config.cities.map((c) => <option key={c} value={c}>{cityName(c, lang)}</option>)}
            </select>
          </Field>
        </div>
        <div className="row-actions">
          <button className="btn btn-primary" disabled={busy}>{L('創建帳戶', 'Create account')}</button>
          {msg && <span className="fine" role="status">{msg}</span>}
        </div>
      </form>}
    </div>
  );
}

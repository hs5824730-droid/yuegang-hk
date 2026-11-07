import { useEffect, useRef, useState, type FormEvent } from 'react';
import { localizedHref } from '../language-path';
import {registrationPath} from '../customer-registration';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, CircleAlert, ExternalLink, Hammer, KeyRound, MessageCircle, Tag } from 'lucide-react';
import { api } from '../api';
import { trackSavedLead } from '../meta-pixel';
import {receptionRequestId} from '../reception-client';
import { cityName, useConfig, useI18n } from '../i18n';
import type { ViewingListing } from '../viewing-types';
import { CONTACT_METHODS, findAdvisor, isContact, normalizeService, normalizeServiceQuery, PUBLIC_SERVICES, SERVICES, SALUTATIONS, SERVICE_GROUPS, START_TIMES, type Salutation, type EnquiryDetails, type PublicService, type Service, type ServiceInput } from '../enquiry-options';
export { PUBLIC_SERVICES, isPhone } from '../enquiry-options';
export type { PublicService } from '../enquiry-options';

const GROUP_ICONS = { rental: KeyRound, sales: Tag, advisory: Hammer, other: MessageCircle };
const GROUP_SHORT_LABELS = { rental: { zh: '出租托管', en: 'Let & manage' }, sales: { zh: '买卖房屋', en: 'Buy & sell' }, advisory: { zh: '置业顾问', en: 'Property services' }, other: { zh: '其他', en: 'Other' } };
const PUBLIC_CONTACT_METHODS = ['phone', 'whatsapp', 'wechat', 'email'] as const;
type PublicContactMethod = typeof PUBLIC_CONTACT_METHODS[number];

const newId = receptionRequestId;

export const isPublicService = (s: string | null | undefined): s is PublicService => (PUBLIC_SERVICES as readonly string[]).includes(s || '');

interface Props {
  defaultService?: ServiceInput;
  defaultCity?: string;
  propertyId?: string;
  propertyAddress?: string;
  preferredAdvisorId?: string;
  offerInterest?: boolean;
  /** The enquiry provider already resolves URL defaults for drawers. */
  useUrlDefaults?: boolean;
  listingId?: string;
  idPrefix?: string;
  /** focus the step title when mounted (drawer) */
  autoFocus?: boolean;
  /** drawer layout: actions pinned to the bottom of the sheet */
  sheet?: boolean;
}

export default function LeadForm({ defaultService = 'letting', defaultCity = '', propertyId, propertyAddress, preferredAdvisorId, offerInterest = false, useUrlDefaults = true, listingId, idPrefix = 'lf', autoFocus = false, sheet = false }: Props) {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const location = useLocation();
  const params = new URLSearchParams(useUrlDefaults ? location.search : '');
  const serviceQuery = params.get('service'), memberQuery = params.get('member'), offerQuery = params.get('offer');
  const sourceListingId = listingId || params.get('listing') || '';
  const [linkedListing, setLinkedListing] = useState<ViewingListing | null>(null);
  const requestedService = normalizeServiceQuery(serviceQuery) || normalizeService(defaultService);
  const initialService = requestedService && requestedService !== 'moving' ? requestedService : 'letting';
  const [customCity, setCustomCity] = useState(Boolean(defaultCity && !config.cities.includes(defaultCity)));
  const [requestId, setRequestId] = useState(newId);
  const lastAttempt = useRef<{ signature: string; requestId: string } | null>(null);
  const savedCity = useRef('');
  const [step, setStepRaw] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const setStep = (n: number) => {
    setDir(n > step ? 'fwd' : 'back');
    setStepRaw(n);
  };
  const [f, setF] = useState({
    service: initialService as Service,
    city: defaultCity,
    address: propertyAddress || '',
    name: '',
    salutation: '' as Salutation | '',
    contact: '',
    message: '',
    website: '',
    contactMethod: 'phone' as PublicContactMethod,
    propertyType: '' as EnquiryDetails['propertyType'] | '', bedrooms: '', offerInterest: offerInterest || offerQuery === '1',
    needSummary: '', startTime: '' as EnquiryDetails['startTime'] | '', budgetRange: '', saleTime: '',
    preferredAdvisorId: findAdvisor(preferredAdvisorId || memberQuery)?.id || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState('');
  const [doneId, setDoneId] = useState('');
  const sendingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const id = (n: string) => `${idPrefix}-${n}`;
  const buying = f.service === 'buying' || f.service === 'buyer-advisory';
  const rental = f.service === 'letting' || f.service === 'management';
  const houseWork = ['renovation', 'house-care', 'maintenance'].includes(f.service);
  const advisor = findAdvisor(f.preferredAdvisorId);
  const selectedGroup = SERVICES[f.service].group;
  useEffect(() => {
    const selected = normalizeServiceQuery(serviceQuery);
    setF(previous => ({ ...previous, ...(selected && selected !== 'moving' ? { service: selected } : {}),
      ...(offerQuery === '1' ? { offerInterest: true } : {}), ...(findAdvisor(memberQuery) ? { preferredAdvisorId: memberQuery! } : {}) }));
  }, [serviceQuery, memberQuery, offerQuery]);
  useEffect(() => {
    if (!/^reference-\d{5,12}$/.test(sourceListingId)) { setLinkedListing(null); return; }
    const controller = new AbortController();
    void fetch(`/api/viewing-samples/${sourceListingId}`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => {
      const listing = data?.listing as ViewingListing | undefined;
      if (!listing) return;
      setLinkedListing(listing); setCustomCity(!config.cities.includes(listing.city));
      setF(previous => ({ ...previous, city: listing.city, address: `${listing.address}, ${listing.suburb}` }));
    }).catch(() => {});
    return () => controller.abort();
  }, [sourceListingId, config.cities]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (!autoFocus) return;
    }
    const el = panelRef.current;
    el?.querySelector<HTMLElement>('[data-step-title]')?.focus({ preventScroll: true });
    el?.closest('.enq-body')?.scrollTo({ top: 0 });
  }, [step, autoFocus]);

  // re-word visible errors when the language changes
  useEffect(() => {
    if (Object.values(errors).some(Boolean)) check(step, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  function check(s: number, focus = true) {
    const e: Record<string, string> = {};
    if (s === 1 && !f.city.trim()) e.city = L('请选择或填写城市', 'Choose or enter a city');
    if (s === 1 && rental && f.bedrooms !== '' && (!Number.isInteger(Number(f.bedrooms)) || Number(f.bedrooms) < 0 || Number(f.bedrooms) > 20)) e.bedrooms = L('请填写 0–20 之间的整数', 'Enter a whole number from 0 to 20');
    if (s === 2) {
      if (!f.name.trim()) e.name = L('请填写称呼', 'Enter your name');
      if (!f.contact.trim()) e.contact=L('请填写联系方式（必填）','Contact details are required');
      else if (!isContact(f.contact, f.contactMethod)) e.contact = f.contactMethod === 'email' ? L('请填写有效的邮箱地址，例如 name@example.com', 'Enter a valid email address, e.g. name@example.com') : f.contactMethod === 'wechat' ? L('请填写有效微信号：6–20 位，以字母开头', 'Enter a valid WeChat ID: 6–20 characters, starting with a letter') : L('请输入有效号码：7–15 位数字，可带 + 和区号', 'Enter a valid number: 7–15 digits, + and area code allowed');
    }
    setErrors(e);
    if (Object.keys(e).length) {
      if (focus) setTimeout(() => panelRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], [aria-invalid="true"] input')?.focus(), 0);
      return false;
    }
    return true;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (step < 2) {
      if (check(step)) setStep(step + 1);
      return;
    }
    if (sendingRef.current || !check(2)) return;
    sendingRef.current = true;
    setSending(true);
    setServerError('');
    try {
      const payload = {
        name: f.name.trim(),
        contact: f.contact.trim(),
        city: f.city.trim(),
        service: f.service,
        language: lang,
        message: f.message.trim() || undefined,
        propertyId,
        propertyAddress: f.address.trim() || undefined,
        consent: true as const,
        website: f.website,
        ...(/^reference-\d{5,12}$/.test(sourceListingId) ? { listingId: sourceListingId } : {}),
        contactMethod: f.contactMethod,
        ...(f.salutation ? { salutation: f.salutation } : {}),
        ...(advisor ? { preferredAdvisorId: advisor.id } : {}),
        ...(rental || houseWork ? { ...(f.propertyType ? { propertyType: f.propertyType } : {}) } : {}),
        ...(rental ? { ...(f.bedrooms ? { bedrooms: Number(f.bedrooms) } : {}), offerInterest: f.offerInterest } : {}),
        ...(houseWork ? { ...(f.needSummary.trim() ? { needSummary: f.needSummary.trim() } : {}), ...(f.startTime ? { startTime: f.startTime } : {}) } : {}),
        ...(buying && f.budgetRange.trim() ? { budgetRange: f.budgetRange.trim() } : {}),
        ...(f.service === 'selling' && f.saleTime.trim() ? { saleTime: f.saleTime.trim() } : {}),
      };
      // An unchanged retry keeps its id even if the first response was lost.
      // Edited details represent a new enquiry and must not be trapped in a 409 loop.
      const signature = JSON.stringify(payload);
      const attemptId = lastAttempt.current && lastAttempt.current.signature !== signature ? newId() : lastAttempt.current?.requestId || requestId;
      lastAttempt.current = { signature, requestId: attemptId };
      const res = await api.createLead({ ...payload, requestId: attemptId });
      savedCity.current=res.city||payload.city;
      setDoneId(res.id);
      trackSavedLead(attemptId);
    } catch (err) {
      const m = (err as Error).message;
      setServerError(
        m === 'network' || /^HTTP/.test(m)
          ? L('没有发送成功：网络或服务暂时不可用。已填写的内容都还在，请稍后重试。', 'Not sent — the network or service is unavailable. Everything you entered is still here; please try again.')
          : m,
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function reset() {
    setDoneId('');
    setStep(0);
    setRequestId(newId());
    lastAttempt.current = null;
    setF((p) => ({ ...p, message: '' }));
  }

  if (doneId) {
    const ref = doneId.slice(0, 8);
    return (
      <div className="lf-done" role="status">
        <CheckCircle2 size={36} strokeWidth={1.6} aria-hidden />
        <h3>{L('咨询已发送', 'Enquiry sent')}</h3>
        <p>
          {L('助理会通过您留下的方式与您联系。咨询编号 ', 'Our assistant will use your chosen contact method. Reference ')}
          <strong className="mono">{ref}</strong>
        </p>
        <div className="lf-done-actions">
          {!rental&&<Link className="btn btn-line" to={registrationPath(f.service)} state={{intake:{leadRequestId:lastAttempt.current?.requestId,name:f.name,contactMethod:f.contactMethod,contact:f.contact,city:savedCity.current,service:f.service==='buyer-advisory'?'buyer-advisory':houseWork?f.service:'buyer-advisory'}}}>{L('继续补充详细需求','Add detailed requirements')}</Link>}
          <button type="button" className="btn btn-quiet" onClick={reset}>
            {L('再咨询一套房', 'Ask about another property')}
          </button>
        </div>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? <p className="field-error" id={id(k + '-err')}>{errors[k]}</p> : null);
  const aria = (k: string) => ({ 'aria-invalid': errors[k] ? true : undefined, 'aria-describedby': errors[k] ? id(k + '-err') : undefined });

  const titles = [
    L('需要哪方面的帮助？', 'What can we help with?'),
    buying ? L('想在哪座城市买房？', 'Where are you looking to buy?') : L('房子在哪座城市？', 'Which city is the property in?'),
    L('怎么联系您？', 'How can we reach you?'),
  ];
  const stepNames = [L('服务', 'Service'), L('城市', 'City'), L('联系', 'Contact')];

  return (
    <form className={`lf ${sheet ? 'lf-sheet' : ''}`} onSubmit={submit} noValidate>
      <ol className="lf-steps" aria-label={L(`第 ${step + 1} 步，共 3 步`, `Step ${step + 1} of 3`)}>
        {stepNames.map((n, i) => (
          <li key={n} className={i < step ? 'done' : i === step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}>
            <span>{i < step ? <Check size={12} strokeWidth={3} aria-hidden /> : i + 1}</span>
            {n}
          </li>
        ))}
      </ol>
      {linkedListing && <p className="lf-listing-reference">{L('咨询房源', 'Viewing enquiry')}：{linkedListing.address}, {linkedListing.suburb}</p>}
      {advisor && <p className="lf-preferred-advisor">{L('指定顾问', 'Preferred advisor')}：{advisor.name} <button type="button" className="linkbtn" onClick={() => set('preferredAdvisorId', '')}>{L('取消指定', 'Clear preference')}</button></p>}

      <div className={`lf-panel dir-${dir}`} ref={panelRef} key={step}>
        <h3 className="lf-title" tabIndex={-1} data-step-title>
          {titles[step]}
        </h3>

        {step === 0 && (
          <fieldset className="lf-service-picker field">
            <legend className="sr-only">{titles[0]}</legend>
            <div className="lf-service-groups" role="group" aria-label={L('服务类别', 'Service category')}>
              {Object.entries(SERVICE_GROUPS).map(([group, label]) => {
                const Icon = GROUP_ICONS[group as keyof typeof GROUP_ICONS];
                const shortLabel = GROUP_SHORT_LABELS[group as keyof typeof GROUP_SHORT_LABELS];
                const active = selectedGroup === group;
                return <button key={group} type="button" className="lf-service-group" aria-pressed={active} onClick={() => {
                  if (!active) set('service', PUBLIC_SERVICES.find(service => SERVICES[service].group === group)!);
                }} aria-label={L(label.zh, label.en)}><Icon size={18} aria-hidden /><span>{L(shortLabel.zh, shortLabel.en)}</span><span className="lf-choice-check" aria-hidden>{active && <Check size={15} />}</span></button>;
              })}
            </div>
            <p className="lf-service-hint">{L('再选一项具体服务，我们会安排对应同事跟进。', 'Choose a service so we can connect you with the right person.')}</p>
            <div className="lf-service-options">
              {PUBLIC_SERVICES.filter(service => SERVICES[service].group === selectedGroup).map(service => <label key={service} className="lf-service-option">
                <input type="radio" name={id('service')} value={service} checked={f.service === service} onChange={() => set('service', service)} />
                <span>{L(SERVICES[service].zh, SERVICES[service].en)}</span><span className="lf-choice-check" aria-hidden>{f.service === service && <Check size={17} />}</span>
              </label>)}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <>
            <fieldset className="field" {...aria('city')}>
              <legend className="sr-only">{L('城市', 'City')}</legend>
              <div className="lf-cities">
                {config.cities.map((c) => (
                  <label key={c} className={`lf-city ${!customCity && f.city === c ? 'on' : ''}`}>
                    <input type="radio" name={id('city')} value={c} checked={!customCity && f.city === c} onChange={() => { setCustomCity(false); set('city', c); }} />
                    {cityName(c, lang)}
                  </label>
                ))}
                <label className={`lf-city ${customCity ? 'on' : ''}`}><input type="radio" name={id('city')} checked={customCity} onChange={() => { setCustomCity(true); set('city', ''); }} />{L('其他城市', 'Another city')}</label>
              </div>
              {customCity && <div className="custom-city"><label htmlFor={id('custom-city')}>{L('城市名称', 'City name')}</label><input id={id('custom-city')} value={f.city} maxLength={80} autoComplete="address-level2" onChange={e => set('city', e.target.value)} {...aria('city')} /></div>}
              {err('city')}
            </fieldset>
            <div className="field">
              <label htmlFor={id('address')}>
                {buying ? L('关注的区域', 'Suburbs you’re interested in') : L('地址或区域', 'Address or suburb')} <span className="opt">{L('选填', 'optional')}</span>
              </label>
              <input id={id('address')} autoComplete={buying ? 'off' : 'street-address'} value={f.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            {f.service !== 'other' && <details className="lf-service-details">
              <summary>{L('补充需求（全部选填）', 'Add details (all optional)')}</summary>
              <fieldset className="lf-optional-fields field-grid"><legend className="sr-only">{L('服务相关信息，全部选填', 'Service details, all optional')}</legend>
                {(rental || houseWork) && <div className="field"><label htmlFor={id('property-type')}>{L('房屋类型', 'Property type')}</label><select id={id('property-type')} value={f.propertyType} onChange={event => set('propertyType', event.target.value as typeof f.propertyType)}><option value="">{L('暂不填写', 'Not specified')}</option><option value="house">{L('独立屋', 'House')}</option><option value="apartment">{L('公寓', 'Apartment')}</option><option value="townhouse">{L('联排屋', 'Townhouse')}</option><option value="other">{L('其他', 'Other')}</option></select></div>}
                {rental && <div className="field"><label htmlFor={id('bedrooms')}>{L('卧室数', 'Bedrooms')}</label><input id={id('bedrooms')} type="number" inputMode="numeric" min={0} max={20} step={1} {...aria('bedrooms')} value={f.bedrooms} onChange={event => set('bedrooms', event.target.value)} />{err('bedrooms')}</div>}
                {houseWork && <><div className="field"><label htmlFor={id('need-summary')}>{L('需求简述', 'What needs doing')}</label><textarea id={id('need-summary')} rows={2} maxLength={1000} value={f.needSummary} onChange={event => set('needSummary', event.target.value)} /></div><div className="field"><label htmlFor={id('start-time')}>{L('希望开始时间', 'Preferred start')}</label><select id={id('start-time')} value={f.startTime} onChange={event => set('startTime', event.target.value as typeof f.startTime)}><option value="">{L('暂不填写', 'Not specified')}</option>{Object.entries(START_TIMES).map(([value, label]) => <option value={value} key={value}>{L(label.zh, label.en)}</option>)}</select></div></>}
                {buying && <div className="field"><label htmlFor={id('budget-range')}>{L('预算区间', 'Budget range')}</label><input id={id('budget-range')} value={f.budgetRange} maxLength={160} placeholder={L('例如 A$80–100 万', 'e.g. A$800,000–1,000,000')} onChange={event => set('budgetRange', event.target.value)} /></div>}
                {f.service === 'selling' && <div className="field"><label htmlFor={id('sale-time')}>{L('预计出售时间', 'When do you plan to sell?')}</label><input id={id('sale-time')} value={f.saleTime} maxLength={160} placeholder={L('例如 3 个月内', 'e.g. within 3 months')} onChange={event => set('saleTime', event.target.value)} /></div>}
              </fieldset>
            </details>}
          </>
        )}

        {step === 2 && (
          <>
            <p className="lf-summary">
              <span>
                {L(SERVICES[f.service].zh, SERVICES[f.service].en)} · {cityName(f.city, lang)}
                {f.address ? ` · ${f.address}` : ''}
              </span>
              <button type="button" className="linkbtn" onClick={() => setStep(0)}>
                {L('修改', 'Edit')}
              </button>
            </p>
            <div className="field">
              <label htmlFor={id('name')}>{L('称呼', 'Name')}</label>
              <input id={id('name')} autoComplete="name" enterKeyHint="next" value={f.name} onChange={(e) => set('name', e.target.value)} {...aria('name')} />
              {err('name')}
            </div>
            <fieldset className="field lf-contact-methods lf-salutation">
              <legend>{L('先生／女士（选填）', 'Mr / Ms (optional)')}</legend>
              <div className="lf-contact-options">{(Object.keys(SALUTATIONS) as Salutation[]).map(value => <button key={value} type="button" aria-pressed={f.salutation === value} onClick={() => set('salutation', f.salutation === value ? '' : value)}>{L(SALUTATIONS[value].zh, SALUTATIONS[value].en)}</button>)}</div>
            </fieldset>
            <fieldset className="field lf-contact-methods">
              <legend>{L('联系方法', 'Contact method')}</legend>
              <div className="lf-contact-options">{PUBLIC_CONTACT_METHODS.map(method => <button key={method} type="button" aria-pressed={f.contactMethod === method} onClick={() => { set('contactMethod', method); setErrors(previous => ({ ...previous, contact: '' })); }}>{L(CONTACT_METHODS[method].zh, CONTACT_METHODS[method].en)}</button>)}</div>
            </fieldset>
            <div className="field">
              <label htmlFor={id('contact')}>{L('联系方式（必填）', 'Contact details (required)')}</label>
              <input
                id={id('contact')}
                required aria-required="true"
                type={f.contactMethod === 'email' ? 'email' : f.contactMethod === 'wechat' ? 'text' : 'tel'}
                inputMode={f.contactMethod === 'email' ? 'email' : f.contactMethod === 'wechat' ? 'text' : 'tel'}
                autoComplete={f.contactMethod === 'email' ? 'email' : f.contactMethod === 'wechat' ? 'off' : 'tel'}
                maxLength={160}
                enterKeyHint="next"
                placeholder={f.contactMethod === 'email' ? 'name@example.com' : f.contactMethod === 'wechat' ? L('您的微信号', 'Your WeChat ID') : '+61 4xx xxx xxx'}
                value={f.contact}
                onChange={(e) => set('contact', e.target.value)}
                {...aria('contact')}
              />
              {err('contact')}
            </div>
            <div className="field">
              <label htmlFor={id('message')}>
                {L('补充说明', 'Anything else')} <span className="opt">{L('选填', 'optional')}</span>
              </label>
              <textarea
                id={id('message')}
                rows={2}
                maxLength={2000}
                placeholder={L('房屋类型、空置时间、方便联系的时段', 'Property type, when it’s vacant, best time to call')}
                value={f.message}
                onChange={(e) => set('message', e.target.value)}
              />
            </div>
            <div className="hp" aria-hidden="true">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF((p) => ({ ...p, website: e.target.value }))} />
              </label>
            </div>
            {serverError && (
              <div className="notice notice-error" role="alert">
                <CircleAlert size={18} aria-hidden />
                <p>{serverError}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="lf-nav">
        {step === 2 && <p className="lf-submit-note">{L('提交后，我们会按您提供的方式联系您。', 'After you submit, we’ll contact you using the details you provide.')} <a href={localizedHref('/privacy', lang)} target="_blank" rel="noopener noreferrer">{L('隐私说明', 'Privacy')}<ExternalLink size={12} aria-hidden /><span className="sr-only">{L('（在新标签页打开）', ' (opens in a new tab)')}</span></a></p>}
        {step > 0 && (
          <button type="button" className="btn btn-quiet lf-back" onClick={() => setStep(step - 1)} aria-label={L('上一步', 'Back')}>
            <ArrowLeft size={18} aria-hidden />
            <span>{L('上一步', 'Back')}</span>
          </button>
        )}
        <button type="submit" className="btn btn-primary lf-next" disabled={sending}>
          {step < 2 ? L('下一步', 'Continue') : sending ? L('正在发送…', 'Sending…') : serverError ? L('重新发送', 'Send again') : L('提交联系方式', 'Submit contact details')}
        </button>
      </div>
      {step === 0 && !sheet && (
        <p className="fine lf-foot">
          {L('提交咨询不等于委托，助理会先了解情况再说明服务与费用。', 'An enquiry isn’t an appointment; our assistant explains services and fees first.')}{' '}
          <Link to="/services">{L('服务说明', 'Services')}</Link>
        </p>
      )}
    </form>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Bi, type Config, type EventType, type LeadStatus, type MovingStatus, type PropertyStatus, type PropertyType, type Role, type Service, type Lang } from './api';
import { SERVICES } from './enquiry-options';
import {useLocation} from 'react-router-dom';
import {languageFromPath} from './language-path';
import {navigateLanguage} from './language-navigation';

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** inline bilingual string */
  L: (zh: string, en: string) => string;
  /** pick from {zh,en}; falls back to the other language when untranslated */
  pick: (b?: Bi | null) => string;
}

const Ctx = createContext<I18n>(null as unknown as I18n);
export const useI18n = () => useContext(Ctx);

function initialLang(): Lang {
  const path = languageFromPath(window.location.pathname);
  if (path) return path;
  const q = new URLSearchParams(window.location.search).get('lang');
  if (q === 'zh' || q === 'en') return q;
  let s: string | null = null;
  try { s = localStorage.getItem('lang'); } catch { /* Storage can be disabled. */ }
  if (s === 'zh' || s === 'en') return s;
  return 'zh';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [fallbackLang, setLangState] = useState<Lang>(initialLang);
  const lang = languageFromPath(window.location.pathname) || fallbackLang;
  const setLang = useCallback((l: Lang) => {
    try { localStorage.setItem('lang', l); } catch { /* URL language works without storage. */ }
    navigateLanguage(l);
    setLangState(l);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang, location.pathname]);
  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      L: (zh, en) => (lang === 'zh' ? zh : en),
      pick: (b) => (b ? b[lang] || b[lang === 'zh' ? 'en' : 'zh'] || '' : ''),
    }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- site config ---------- */
interface ConfigState {
  config: Config;
  loaded: boolean;
}
const fallbackConfig: Config = {
  brand: { zh: '桉湾', en: 'EUCOVE' },
  whatsappNumber: '',
  telegramConfigured: false,
  cities: ['Melbourne', 'Sydney', 'Perth', 'Adelaide', 'Canberra', 'Brisbane'],
  promotion: { endMonth: '2027-02' },
};
const CfgCtx = createContext<ConfigState>({ config: fallbackConfig, loaded: false });
export const useConfig = () => useContext(CfgCtx);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfigState>({ config: fallbackConfig, loaded: false });
  useEffect(() => {
    api
      .config()
      .then((config) => setState({ config: { ...fallbackConfig, ...config }, loaded: true }))
      .catch(() => setState({ config: fallbackConfig, loaded: true }));
  }, []);
  return <CfgCtx.Provider value={state}>{children}</CfgCtx.Provider>;
}

/** WhatsApp deep link, or null when no number is configured (never invent one). */
export function useWhatsApp() {
  const { config } = useConfig();
  const { L } = useI18n();
  const digits = (config.whatsappNumber || '').replace(/[^\d]/g, '');
  return (text?: string) => {
    if (!digits) return null;
    const msg = text ?? L('你好，我想咨询房产出租／托管服务。', 'Hello, I would like to ask about letting or managing my property.');
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };
}

/* ---------- label helpers ---------- */
const CITY_ZH: Record<string, string> = { Melbourne: '墨尔本', Sydney: '悉尼', Perth: '珀斯', Adelaide: '阿德莱德', Canberra: '堪培拉', Brisbane: '布里斯班', 'Gold Coast': '黄金海岸' };
export const cityName = (c: string | null | undefined, lang: Lang) => (c ? (lang === 'zh' ? CITY_ZH[c] || c : c) : '');

const STATE: Record<string, string> = { Melbourne: 'VIC', Sydney: 'NSW', Perth: 'WA', Adelaide: 'SA', Canberra: 'ACT', Brisbane: 'QLD' };
export const stateCode = (c: string) => STATE[c] || '';

export const typeLabel = (t: PropertyType, lang: Lang) =>
  ({
    house: ['独立屋', 'House'],
    apartment: ['公寓', 'Apartment'],
    townhouse: ['联排屋', 'Townhouse'],
    land: ['土地', 'Land'],
  })[t][lang === 'zh' ? 0 : 1];

export const statusLabel = (s: PropertyStatus, lang: Lang) =>
  ({
    sale: ['在售', 'For sale'],
    rent: ['出租', 'For rent'],
    sold: ['已售', 'Sold'],
    leased: ['已租', 'Leased'],
  })[s][lang === 'zh' ? 0 : 1];

export const serviceLabel = (s: Service, lang: Lang) =>
  SERVICES[s]?.[lang] || s;

export const leadStatusLabel = (s: LeadStatus, lang: Lang) =>
  ({
    new: ['未联系', 'New'],
    contacted: ['已联系', 'Contacted'],
    following: ['跟进中', 'Following up'],
    completed: ['已完成', 'Completed'],
    closed: ['已关闭', 'Closed'],
  })[s][lang === 'zh' ? 0 : 1];

export const movingLabel = (s: MovingStatus, lang: Lang) =>
  ({
    none: ['无', 'None'],
    requested: ['已申请', 'Requested'],
    scheduled: ['已排期', 'Scheduled'],
    completed: ['已完成', 'Completed'],
  })[s][lang === 'zh' ? 0 : 1];

export const roleLabel = (r: Role, lang: Lang) =>
  ({ admin: ['管理员', 'Admin'], manager: ['城市负责人', 'City manager'], assistant: ['助理', 'Assistant'], mail:['邮件接待','Mail agent'] })[r][lang === 'zh' ? 0 : 1];

export const eventLabel = (e: EventType, lang: Lang) =>
  ({
    listed: ['挂牌', 'Listed'],
    price_changed: ['调价', 'Price change'],
    sold: ['成交', 'Sold'],
    leased: ['出租成交', 'Leased'],
  })[e][lang === 'zh' ? 0 : 1];

export const money = (n: number | null | undefined) => (n == null ? '' : 'A$' + Math.round(n).toLocaleString('en-AU'));

export function formatDate(iso: string | null | undefined, lang: Lang) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatMonth(ym: string, lang: Lang) {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return lang === 'zh' ? `${y}年${m}月` : new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

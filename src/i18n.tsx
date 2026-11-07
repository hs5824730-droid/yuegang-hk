import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type Bi, type Config, type EventType, type LeadStatus, type MovingStatus, type PropertyStatus, type PropertyType, type Role, type Service, type Lang } from './api';
import { SERVICES } from './enquiry-options';
import {useLocation} from 'react-router-dom';
import {languageFromPath} from './language-path';
import {navigateLanguage} from './language-navigation';
import {storedZhVariant, toWrittenChinese, type SiteLanguage, type ZhVariant} from './zh-variant';

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Chinese display variant: 粵語 (as written) or 繁體中文 書面語. */
  zhVariant: ZhVariant;
  /** Switch among 粵語, 繁體中文 and English. */
  setSiteLanguage: (l: SiteLanguage) => void;
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
  const [zhVariant, setZhVariant] = useState<ZhVariant>(storedZhVariant);
  const lang = languageFromPath(window.location.pathname) || fallbackLang;
  const setLang = useCallback((l: Lang) => {
    try { localStorage.setItem('lang', l); } catch { /* URL language works without storage. */ }
    navigateLanguage(l);
    setLangState(l);
  }, []);
  const setSiteLanguage = useCallback((l: SiteLanguage) => {
    if (l !== 'en') { try { localStorage.setItem('zhVariant', l); } catch { /* storage optional */ } setZhVariant(l); }
    setLang(l === 'en' ? 'en' : 'zh');
  }, [setLang]);
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en-HK';
  }, [lang, location.pathname]);
  const value = useMemo<I18n>(
    () => {
      const zh = (text: string) => (zhVariant === 'hant' ? toWrittenChinese(text) : text);
      return {
        lang,
        setLang,
        zhVariant,
        setSiteLanguage,
        L: (zhText: string, en: string) => (lang === 'zh' ? zh(zhText) : en),
        pick: (b?: Bi | null) => (b ? (lang === 'zh' ? (b.zh ? zh(b.zh) : b.en) : b.en || b.zh) || '' : ''),
      };
    },
    [lang, setLang, zhVariant, setSiteLanguage],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- site config ---------- */
interface ConfigState {
  config: Config;
  loaded: boolean;
}
const fallbackConfig: Config = {
  brand: { zh: '悦港', en: 'Harbour Joy' },
  whatsappNumber: '',
  telegramConfigured: false,
  cities: ['Hong Kong Island', 'Kowloon', 'New Territories', 'Islands'],
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
    const msg = text ?? L('你好，我想查詢房產出租／託管服務。', 'Hello, I would like to ask about letting or managing my property.');
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };
}

/* ---------- label helpers ---------- */
const CITY_ZH: Record<string, string> = { 'Hong Kong Island': '港島', Kowloon: '九龍', 'New Territories': '新界', Islands: '離島' };
export const cityName = (c: string | null | undefined, lang: Lang) => (c ? (lang === 'zh' ? CITY_ZH[c] || c : c) : '');

const STATE: Record<string, string> = { 'Hong Kong Island': 'HK', Kowloon: 'KLN', 'New Territories': 'NT', Islands: 'NT' };
export const stateCode = (c: string) => STATE[c] || '';

export const typeLabel = (t: PropertyType, lang: Lang) =>
  ({
    house: ['獨立屋', 'House'],
    apartment: ['公寓', 'Apartment'],
    townhouse: ['聯排屋', 'Townhouse'],
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
    new: ['未聯絡', 'New'],
    contacted: ['已聯絡', 'Contacted'],
    following: ['跟進中', 'Following up'],
    completed: ['已完成', 'Completed'],
    closed: ['已關閉', 'Closed'],
  })[s][lang === 'zh' ? 0 : 1];

export const movingLabel = (s: MovingStatus, lang: Lang) =>
  ({
    none: ['無', 'None'],
    requested: ['已申請', 'Requested'],
    scheduled: ['已排期', 'Scheduled'],
    completed: ['已完成', 'Completed'],
  })[s][lang === 'zh' ? 0 : 1];

export const roleLabel = (r: Role, lang: Lang) =>
  ({ admin: ['管理員', 'Admin'], manager: ['地區負責人', 'City manager'], assistant: ['同事', 'Assistant'], mail:['郵件接待','Mail agent'] })[r][lang === 'zh' ? 0 : 1];

export const eventLabel = (e: EventType, lang: Lang) =>
  ({
    listed: ['掛牌', 'Listed'],
    price_changed: ['調價', 'Price change'],
    sold: ['成交', 'Sold'],
    leased: ['出租成交', 'Leased'],
  })[e][lang === 'zh' ? 0 : 1];

export const money = (n: number | null | undefined) => (n == null ? '' : 'HK$' + Math.round(n).toLocaleString('en-HK'));

export function formatDate(iso: string | null | undefined, lang: Lang) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'zh' ? 'zh-HK' : 'en-HK', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatMonth(ym: string, lang: Lang) {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return lang === 'zh' ? `${y}年${m}月` : new Date(y, m - 1, 1).toLocaleDateString('en-HK', { month: 'long', year: 'numeric' });
}

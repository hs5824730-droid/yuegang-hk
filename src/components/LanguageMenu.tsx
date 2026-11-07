import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '../i18n';
import type { SiteLanguage } from '../zh-variant';
import './language-menu.css';

/** Each language is named in itself, with a one-line hint in the same language. */
const OPTIONS: { value: SiteLanguage; label: string; short: string; hint: string; lang: string }[] = [
  { value: 'yue', label: '粵語', short: '粵', hint: '用廣東話同你傾', lang: 'yue-HK' },
  { value: 'hant', label: '繁體中文', short: '繁', hint: '標準書面語', lang: 'zh-HK' },
  { value: 'en', label: 'English', short: 'EN', hint: 'Read in English', lang: 'en' },
];

export default function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { lang, zhVariant, setSiteLanguage } = useI18n();
  const current: SiteLanguage = lang === 'en' ? 'en' : zhVariant;
  const active = OPTIONS.find(o => o.value === current)!;
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => { if (open) items.current[focus]?.focus(); }, [open, focus]);

  const show = (index = OPTIONS.findIndex(o => o.value === current)) => { setFocus(index); setOpen(true); };
  const choose = (value: SiteLanguage) => { setOpen(false); button.current?.focus(); if (value !== current) setSiteLanguage(value); };
  const onMenuKey = (event: KeyboardEvent) => {
    const n = OPTIONS.length;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); button.current?.focus(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setFocus((focus + 1) % n); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setFocus((focus - 1 + n) % n); }
    else if (event.key === 'Home') { event.preventDefault(); setFocus(0); }
    else if (event.key === 'End') { event.preventDefault(); setFocus(n - 1); }
    else if (event.key === 'Tab') setOpen(false);
  };

  return <div className={`lang-menu ${open ? 'is-open' : ''} ${compact ? 'is-compact' : ''}`} ref={root}>
    <button ref={button} type="button" className="lang-menu-button" aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      aria-label={`Language / 語言: ${active.label}`}
      onClick={() => (open ? setOpen(false) : show())}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(event.key === 'ArrowUp' ? OPTIONS.length - 1 : 0); } }}>
      <Globe size={16} aria-hidden />
      <span className="lang-menu-full" lang={active.lang}>{active.label}</span>
      <span className="lang-menu-short" lang={active.lang}>{active.short}</span>
      <ChevronDown size={15} aria-hidden className="lang-menu-chevron" />
    </button>
    {open && <div className="lang-menu-panel" role="menu" id={id} aria-label="Language / 語言" onKeyDown={onMenuKey}>
      {OPTIONS.map((option, index) => <button key={option.value} ref={el => { items.current[index] = el; }} type="button" role="menuitemradio"
        aria-checked={option.value === current} tabIndex={index === focus ? 0 : -1} lang={option.lang}
        className="lang-menu-item" onClick={() => choose(option.value)} onMouseEnter={() => setFocus(index)}>
        <span className="lang-menu-badge" aria-hidden>{option.short}</span>
        <span className="lang-menu-text"><strong>{option.label}</strong><small>{option.hint}</small></span>
        {option.value === current && <Check size={17} aria-hidden className="lang-menu-check" />}
      </button>)}
    </div>}
  </div>;
}

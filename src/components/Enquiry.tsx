import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { isLanguageSwitchEvent } from '../language-path';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { findAdvisor, normalizeServiceQuery, type ServiceInput } from '../enquiry-options';
import { useI18n } from '../i18n';
import LeadForm from './LeadForm';
import { exitMs, setScrollLock } from './ui';
import { LangToggle } from './Layout';

interface Opts {
  service?: ServiceInput;
  city?: string;
  propertyId?: string;
  propertyAddress?: string;
  member?: string;
  offer?: boolean;
  listing?: string;
}
const Ctx = createContext<{ open: (o?: Opts) => void; isOpen: boolean }>({ open: () => {}, isOpen: false });
export const useEnquiry = () => useContext(Ctx).open;
export const useEnquiryOpen = () => useContext(Ctx).isOpen;

const MARK = 'enquiry-sheet';

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const { L } = useI18n();
  const location = useLocation();
  const lastUrl = useRef('');
  const [state, setState] = useState<{ open: boolean; opts: Opts; key: number }>({ open: false, opts: {}, key: 0 });
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const ignorePop = useRef(false);

  const open = useCallback((opts: Opts = {}) => {
    returnFocus.current = document.activeElement as HTMLElement;
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setState((s) => ({ open: true, opts, key: s.key + 1 }));
    // A history entry lets the phone's back gesture close the sheet instead of leaving the page.
    if (!pushed.current) {
      window.history.pushState({ ...(window.history.state || {}), [MARK]: true }, '');
      pushed.current = true;
    }
  }, []);

  useEffect(() => {
    if (location.pathname === '/contact' || location.pathname.startsWith('/contact/') || location.pathname.startsWith('/admin') || /registration\/?$/.test(location.pathname)) return;
    const query = new URLSearchParams(location.search);
    const service = normalizeServiceQuery(query.get('service'));
    const advisor = findAdvisor(query.get('member'));
    const offer = query.get('offer') === '1';
    const key = location.pathname + location.search;
    if ((!service && !advisor && !offer) || lastUrl.current === key) return;
    lastUrl.current = key;
    open({ service: service === 'moving' ? 'letting' : service, member: advisor?.id, offer,
      city: query.get('city') || advisor?.city || undefined, listing: query.get('listing') || undefined });
  }, [location.pathname, location.search, open]);

  const finishClose = useCallback(() => {
    // short exit animation, then unmount; focus returns to whatever opened the sheet
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      setState((s) => ({ ...s, open: false }));
      returnFocus.current?.focus?.({ preventScroll: true });
    }, exitMs());
  }, []);

  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname;
      if (state.open) {
        // A success-screen channel link navigates forward; keep that new URL.
        pushed.current = false;
        finishClose();
      }
    }
  }, [location.pathname, state.open, finishClose]);

  const close = useCallback(() => {
    // Close right away, then drop the history entry we added; that pop is ignored.
    if (pushed.current) {
      pushed.current = false;
      ignorePop.current = true;
      window.history.back();
    }
    finishClose();
  }, [finishClose]);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (isLanguageSwitchEvent(event)) {
        pushed.current = false;
        ignorePop.current = false;
        return;
      }
      if (ignorePop.current) {
        ignorePop.current = false;
        return;
      }
      if (pushed.current) {
        pushed.current = false;
        finishClose();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [finishClose]);

  useEffect(() => {
    if (!state.open) return;
    setScrollLock('enquiry', true);
    // Follow the visual viewport so the bottom actions stay above the on-screen keyboard.
    const vv = window.visualViewport;
    const fit = () => {
      const el = rootRef.current;
      if (!el || !vv) return;
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
      // keep the field being typed into visible above the keyboard and the pinned actions
      const active = document.activeElement as HTMLElement | null;
      if (active && el.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
        requestAnimationFrame(() => active.scrollIntoView({ block: 'center' }));
      }
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && dialogRef.current) {
        const els = dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select,textarea,[tabindex="0"]');
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      setScrollLock('enquiry', false);
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      document.removeEventListener('keydown', onKey);
    };
  }, [state.open, close]);

  return (
    <Ctx.Provider value={{ open, isOpen: state.open }}>
      {children}
      {state.open && (
        <div className={`enq-root ${closing ? 'closing' : ''}`} ref={rootRef}>
          <div className="enq-scrim" onClick={close} aria-hidden />
          <div className="enq" role="dialog" aria-modal="true" aria-labelledby="enq-title" ref={dialogRef}>
            <div className="enq-head">
              <h2 id="enq-title">{L('留下你的联系方式', 'Leave your contact details')}</h2>
              <LangToggle />
              <button type="button" className="icon-btn" onClick={close} aria-label={L('关闭', 'Close')}>
                <X size={22} />
              </button>
            </div>
            <div className="enq-body">
              <LeadForm
                key={state.key}
                idPrefix="enq"
                sheet
                autoFocus
                defaultService={state.opts.service}
                defaultCity={state.opts.city}
                propertyId={state.opts.propertyId}
                propertyAddress={state.opts.propertyAddress}
                preferredAdvisorId={state.opts.member}
                offerInterest={state.opts.offer}
                useUrlDefaults={false}
                listingId={state.opts.listing}
              />
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

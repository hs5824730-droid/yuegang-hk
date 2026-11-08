import { lazy, Suspense, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnquiryProvider } from '../components/Enquiry';
import { ContactPageProvider } from '../components/ContactPageContext';
import { useI18n } from '../i18n';
import { STYLES, StyleSwitcher } from './shared';
import './lab.css';

const PAGES = {
  app: lazy(() => import('./AppStyle')),
  immersive: lazy(() => import('../components/immersive/ImmersiveHome')),
  magazine: lazy(() => import('./MagazineStyle')),
  cinema: lazy(() => import('./CinemaStyle')),
};
const PREVIEW: Record<string, string> = { app: '/img/hk/taikoo-shing.webp', immersive: '/img/hk/harbour-night.webp', magazine: '/img/hk/mid-levels.webp', cinema: '/img/hk/kowloon.webp' };

/** Side-by-side style prototypes for the home page. Outside the site layout so each look is self-contained. */
export default function StyleLab() {
  const { id } = useParams();
  const { L } = useI18n();
  useEffect(() => { window.scrollTo(0, 0); document.title = L('悦港 · 風格比較', 'Harbour Joy · Style lab'); }, [id, L]);
  const Page = id ? PAGES[id as keyof typeof PAGES] : null;
  return (
    <ContactPageProvider>
      <EnquiryProvider>
        <StyleSwitcher />
        {Page ? (
          <Suspense fallback={<p className="lab-loading">{L('載入緊…', 'Loading…')}</p>}><Page /></Suspense>
        ) : (
          <main className="lab-index">
            <p className="lab-index-kicker">Harbour Joy · {L('首頁風格比較', 'Home page directions')}</p>
            <h1>{L('四個方向，揀一個繼續做', 'Four directions — pick one to continue')}</h1>
            <p className="lab-index-lead">{L('每個都係完整首頁，用真實屋苑相同盤源。撳入去試吓滑動同點擊，頂部可以隨時切換。', 'Each is a full home page using the real estate photos and listings. Scroll and click around; switch any time from the top bar.')}</p>
            <ul>
              {STYLES.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/styles/${s.id}`}>
                    <img src={PREVIEW[s.id]} alt="" />
                    <span className="lab-index-no">0{i + 1}</span>
                    <strong>{L(s.zh, s.en)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </main>
        )}
      </EnquiryProvider>
    </ContactPageProvider>
  );
}

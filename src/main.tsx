import ReceptionContact from './components/ReceptionContact';
import MetaPixel from './components/MetaPixel';
import { StrictMode,lazy,Suspense,useLayoutEffect,type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import {LanguageRouter, LanguageSeo} from './LanguageRouter';
import {languageFromPath} from './language-path';
import {isComSite} from './site-home';
import '@radix-ui/colors/sand.css';
import '@radix-ui/colors/orange.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource-variable/noto-sans-sc';
import { ConfigProvider, I18nProvider } from './i18n';
import Layout from './components/Layout';
import Home from './pages/Home';
import { About, Credits, NotFound, Offer, Privacy, Services } from './pages/Info';
import { History, PropertyDetail, Properties } from './pages/Properties';
import Viewings from './pages/Overseas';
import BuySell from './pages/BuySell';
import Advisory from './pages/Advisory';
import Admin from './pages/Admin';
import './styles.css';
import './service-site.css';
import './eucove-ds.css';
import './sol-release.css';
import './hk-site.css';
import './hk-theme.css';

const RentalRegistration=lazy(()=>import('./pages/RentalRegistration'));
const CustomerRegistration=lazy(()=>import('./pages/CustomerRegistration'));
const RegistrationHub=lazy(()=>import('./pages/RegistrationHub'));
const HomeServices=lazy(()=>import('./pages/HomeServices'));
const StyleLab=lazy(()=>import('./styles-lab/StyleLab'));
function ComStandaloneBoundary({children}:{children:ReactNode}) {
  const location=useLocation();
  const com=isComSite();
  const standalone=/^\/(?:admin(?:\/|$)|(?:registration|(?:rental|buying|selling|advisory)-registration|home-services)\/?$|contact(?:\/|$))/.test(location.pathname);
  const reload=com&&!standalone;
  useLayoutEffect(()=>{if(reload)window.location.replace(window.location.href)},[reload,location.pathname,location.search,location.hash]);
  // Marketing routes are owned by .com's frozen frontend, including return links.
  // Keep analytics and the .net page tree unmounted during the document hand-off.
  return reload?null:children;
}
function LegacyViewings() {const location=useLocation();return <Navigate to={'/viewings'+location.search+location.hash} replace/>;}
function SiteRoutes() {return <Routes>
            {!languageFromPath(window.location.pathname)&&<Route path="/admin/*" element={<Admin />} />}
            <Route path="styles" element={<Suspense fallback={null}><StyleLab /></Suspense>} />
            <Route path="styles/:id" element={<Suspense fallback={null}><StyleLab /></Suspense>} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="services" element={<Services />} />
              <Route path="offer" element={<Offer />} />
              <Route path="properties" element={<Properties />} />
              <Route path="properties/:id" element={<PropertyDetail />} />
              <Route path="history" element={<History />} />
              <Route path="viewings" element={<Viewings />} />
              <Route path="overseas" element={<LegacyViewings />} />
              <Route path="buy-sell" element={<BuySell />} />
              <Route path="advisory" element={<Advisory />} />
              <Route path="home-services" element={<Suspense fallback={<p role="status" className="wrap">正在載入 / Loading…</p>}><HomeServices /></Suspense>} />
              <Route path="contact" element={<ReceptionContact />} />
              <Route path="rental-registration" element={<Suspense fallback={<p role="status" className="wrap">正在載入 / Loading…</p>}><RentalRegistration /></Suspense>} />
              <Route path="registration" element={<Suspense fallback={<p role="status" className="wrap">正在載入 / Loading…</p>}><RegistrationHub /></Suspense>} />
              {(['buying','selling','advisory'] as const).map(type=><Route key={type} path={type+'-registration'} element={<Suspense fallback={<p role="status" className="wrap">正在載入 / Loading…</p>}><CustomerRegistration key={type} type={type}/></Suspense>}/>)}
              <Route path="contact/phone" element={<ReceptionContact channel="phone" />} />
              <Route path="contact/whatsapp" element={<ReceptionContact channel="whatsapp" />} />
              <Route path="contact/wechat" element={<ReceptionContact channel="wechat" />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="credits" element={<Credits />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>;}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageRouter>
      <ComStandaloneBoundary>
      <MetaPixel />
      <I18nProvider>
        <ConfigProvider>
          <LanguageSeo />
          <SiteRoutes />

        </ConfigProvider>
      </I18nProvider>
      </ComStandaloneBoundary>
    </LanguageRouter>
  </StrictMode>,
);


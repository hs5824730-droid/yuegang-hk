import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPublicPageView } from '../meta-pixel';

export default function MetaPixel() {
  const { pathname } = useLocation();
  const actualPath = window.location.pathname;
  useEffect(() => { trackPublicPageView(); }, [pathname, actualPath]);
  return null;
}

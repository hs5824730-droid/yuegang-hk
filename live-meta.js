/* Explicit PageView only, inside the opaque tracking document. */
(function () {
  'use strict';
  if (window.top === window || window.origin !== 'null' || location.search !== '?__eucove_pixel=1' || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  if (window.fbq) return;
  const id = '1774502991020855';
  const fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
  window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
  // These flags are present in Meta's current official SDK. Keep only manual PageView,
  // without automatic form matching, config plugins, SPA history hooks or extra events.
  fbq.disablePushState = true; fbq.disableConfigLoading = true; fbq.disableAutoConfig = true;
  fbq('set', 'autoConfig', false, id);
  fbq('init', id);
  fbq('trackSingle', id, 'PageView');
  const script = document.createElement('script');
  script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  script.referrerPolicy = 'no-referrer'; document.head.appendChild(script);
})();

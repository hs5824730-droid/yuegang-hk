/* Page view, or one Lead, inside the opaque tracking document.
   The event name is always a literal. Meta labels a track call with no name as __missing_event. */
(function () {
  'use strict';
  var lead = location.search === '?__eucove_pixel=lead';
  var page = location.search === '?__eucove_pixel=1';
  if (window.top === window || window.origin !== 'null' || (!lead && !page) || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  if (window.fbq) return;
  var id = '1774502991020855';
  var fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
  window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
  // These flags are present in Meta's current official SDK. Keep manual events only,
  // without automatic form matching, config plugins, SPA history hooks or extra events.
  fbq.disablePushState = true; fbq.disableConfigLoading = true; fbq.disableAutoConfig = true;
  fbq('set', 'autoConfig', false, id);
  fbq('init', id);
  // A saved enquiry loads this exact document. The event name stays a literal.
  if (lead) fbq('track', 'Lead');
  else fbq('trackSingle', id, 'PageView');
  var script = document.createElement('script');
  script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  script.referrerPolicy = 'no-referrer'; document.head.appendChild(script);
})();

(function () {
  'use strict';

  var endpoint = 'https://analytics.jiangyuan.org/v1/collect';
  var site = location.hostname.toLowerCase().replace(/^www\./, '');
  if (site !== 'eucove.com') return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;

  function excluded(path) { return /^\/(?:admin|contact)(?:\/|$)/i.test(path); }
  function uuid() {
    if (self.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      return (char === 'x' ? random : (random & 3 | 8)).toString(16);
    });
  }
  function getId(storage, key) {
    try {
      var value = storage.getItem(key);
      if (!value) { value = uuid(); storage.setItem(key, value); }
      return value;
    } catch (_) { return uuid(); }
  }
  function cleanUrl(value) {
    try { var url = new URL(value, location.href); return url.origin + url.pathname; }
    catch (_) { return ''; }
  }

  var visitorId = getId(localStorage, 'jy_analytics_visitor');
  var sessionId = getId(sessionStorage, 'jy_analytics_session');
  var pageViewId = '';
  var pageReady = Promise.resolve();
  var currentPath = '';
  var lastInteraction = Date.now();
  var lastTick = Date.now();
  var pendingActive = 0;

  function payload(type, extra) {
    return Object.assign({
      type: type,
      id: type === 'heartbeat' ? uuid() : (extra && extra.id) || uuid(),
      page_view_id: pageViewId,
      visitor_id: visitorId,
      session_id: sessionId,
      site: site,
      path: currentPath,
      occurred_at: new Date().toISOString()
    }, extra || {});
  }
  function send(data, beacon) {
    var body = JSON.stringify(data);
    if (beacon && navigator.sendBeacon) {
      return Promise.resolve(navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' })));
    }
    return fetch(endpoint, {
      method: 'POST', mode: 'cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body
    }).catch(function () {});
  }
  function flush(beacon) {
    if (!pendingActive || !pageViewId || excluded(currentPath)) return;
    var seconds = Math.min(30, pendingActive);
    pendingActive -= seconds;
    pageReady.then(function () { send(payload('heartbeat', { active_seconds: seconds }), beacon); });
  }
  function recordPageView() {
    var nextPath = location.pathname || '/';
    if (nextPath === currentPath) return;
    flush(true);
    currentPath = nextPath;
    pendingActive = 0;
    lastTick = Date.now();
    if (excluded(currentPath)) { pageViewId = ''; pageReady = Promise.resolve(); return; }
    pageViewId = uuid();
    pageReady = send(payload('page_view', {
      id: pageViewId,
      page_url: cleanUrl(location.href),
      referrer: cleanUrl(document.referrer),
      screen_width: Math.round(screen.width || 0),
      screen_height: Math.round(screen.height || 0),
      language: navigator.language || '',
      timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || '')
    }));
  }

  function markActive() { lastInteraction = Date.now(); }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (name) {
    addEventListener(name, markActive, { passive: true, capture: true });
  });
  setInterval(function () {
    var now = Date.now();
    var elapsed = Math.min(15, Math.max(0, Math.round((now - lastTick) / 1000)));
    if (pageViewId && document.visibilityState === 'visible' && now - lastInteraction <= 30000) pendingActive += elapsed;
    lastTick = now;
    if (pendingActive >= 10) flush(false);
  }, 5000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
  addEventListener('pagehide', function () { flush(true); });

  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      setTimeout(recordPageView, 0);
      return result;
    };
  });
  addEventListener('popstate', function () { setTimeout(recordPageView, 0); });

  window.addEventListener('click', function (event) {
    if (!pageViewId || excluded(location.pathname)) return;
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || !/^(?:whatsapp:|https?:\/\/(?:api\.)?whatsapp\.com\/|https?:\/\/wa\.me\/)/i.test(link.href || '')) return;
    pageReady.then(function () {
      send(payload('whatsapp_click', { id: uuid(), target_url: cleanUrl(link.href) }), true);
    });
  }, true);

  recordPageView();
})();

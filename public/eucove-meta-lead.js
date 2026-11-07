/* The frozen eucove.com marketing bundle saves an enquiry and shows .lf-done,
   but it never calls trackSavedLead. Load a Lead-only pixel document instead of
   posting a message into the sandboxed frame. No enquiry fields are put in the URL. */
(function () {
  'use strict';
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  var seen = Object.create(null);
  var pending = Object.create(null);
  var timer = 0;
  function signal(ref) {
    if (!ref || seen[ref]) return true;
    var frame = document.querySelector('iframe[title="Page view measurement"]');
    if (!frame || !frame.src || !frame.replaceWith) return false;
    var next = document.createElement('iframe');
    next.hidden = true;
    next.tabIndex = -1;
    next.setAttribute('aria-hidden', 'true');
    next.title = 'Page view measurement';
    next.referrerPolicy = 'no-referrer';
    next.setAttribute('sandbox', 'allow-scripts');
    next.src = frame.src.split('?')[0] + '?__eucove_pixel=lead';
    frame.replaceWith(next);
    seen[ref] = true;
    return true;
  }
  function scan() {
    var nodes = document.querySelectorAll('.lf-done');
    for (var i = 0; i < nodes.length; i++) {
      var mono = nodes[i].querySelector('.mono');
      var ref = mono && mono.textContent ? String(mono.textContent).trim() : '';
      if (ref) pending[ref] = true;
    }
    var keys = Object.keys(pending);
    for (var j = 0; j < keys.length; j++) if (signal(keys[j])) delete pending[keys[j]];
    if (!Object.keys(pending).length || timer) return;
    var started = Date.now();
    timer = setInterval(function () {
      scan();
      if (!Object.keys(pending).length || Date.now() - started > 10000) { clearInterval(timer); timer = 0; }
    }, 250);
  }
  function start() {
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    scan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

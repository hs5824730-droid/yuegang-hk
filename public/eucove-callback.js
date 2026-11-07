/* .com callback form. A failed submit must not load a Lead pixel. */
(function () {
  'use strict';
  function uuid() {
    var cryptoRef = globalThis.crypto;
    if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
      try { return cryptoRef.randomUUID(); } catch (error) { /* Fall through. */ }
    }
    var bytes = new Uint8Array(16);
    if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') cryptoRef.getRandomValues(bytes);
    else for (var index = 0; index < 16; index++) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map.call(bytes, function (value) { return value.toString(16).padStart(2, '0'); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }
  function boot() {
    var form = document.getElementById('eucove-callback-form');
    if (!form || form.dataset.eucoveReady === '1') return;
    form.dataset.eucoveReady = '1';
    var status = document.getElementById('eucove-callback-status');
    var city = form.querySelector('[name="city"]');
    var otherLabel = form.querySelector('[data-city-other]');
    var other = form.querySelector('[name="cityOther"]');
    var requestField = form.querySelector('[name="requestId"]');
    var button = form.querySelector('button[type="submit"]');
    var lastSignature = '';
    var sending = false;
    var fired = Object.create(null);
    var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function field(name) { return form.querySelector('[name="' + name + '"]'); }
    function showStatus(message, isError) {
      if (!status) return;
      status.hidden = false;
      status.className = isError ? 'eucove-callback-status is-error' : 'eucove-callback-status';
      status.textContent = message;
    }
    function syncOther() {
      if (!otherLabel || !city) return;
      var active = city.value === 'other';
      otherLabel.hidden = !active;
      if (other) other.required = active;
    }
    function currentId(renew) {
      if (!requestField) return uuid();
      if (renew || !uuidPattern.test(requestField.value)) requestField.value = uuid();
      return requestField.value;
    }
    function pixelSrc() {
      if (location.protocol !== 'https:') return '';
      var host = String(location.hostname || '').replace(/^www\./, '');
      if (host !== 'eucove.com') return '';
      var path = String(location.pathname || '/').replace(/\/$/, '') || '/';
      return 'https://eucove.com' + (path === '/' ? '/' : path) + '?__eucove_pixel=lead';
    }
    function fireLead(id) {
      try {
        if (!id || fired[id]) return;
        if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
        var src = pixelSrc();
        if (!src) return;
        fired[id] = true;
        var frame = document.createElement('iframe');
        frame.hidden = true;
        frame.tabIndex = -1;
        frame.title = 'Page view measurement';
        frame.referrerPolicy = 'no-referrer';
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.src = src;
        var current = document.querySelector('iframe[title="Page view measurement"]');
        if (current && current.replaceWith) current.replaceWith(frame);
        else if (document.body) document.body.appendChild(frame);
      } catch (error) { /* A saved enquiry must not depend on analytics. */ }
    }
    function applyLanguage() {
      var language = field('language');
      var english = !!(document.documentElement && document.documentElement.lang.toLowerCase().indexOf('en') === 0);
      if (language) language.value = english ? 'en' : 'zh';
      if (typeof form.querySelectorAll !== 'function') return;
      var options = form.querySelectorAll('option[data-zh]');
      for (var index = 0; index < options.length; index++) options[index].textContent = english ? options[index].getAttribute('data-en') : options[index].getAttribute('data-zh');
    }
    if (city && city.addEventListener) city.addEventListener('change', syncOther);
    syncOther();
    applyLanguage();
    if (typeof MutationObserver === 'function' && document.documentElement) {
      new MutationObserver(applyLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    var sticky = document.querySelector('.eucove-callback-sticky');
    var target = document.getElementById('eucove-callback');
    if (sticky && target && typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function (entries) { sticky.hidden = entries[0].isIntersecting; }, { threshold: 0.4 }).observe(target);
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
        if (typeof form.reportValidity === 'function') form.reportValidity();
        return;
      }
      if (sending) return;
      var name = field('name').value.trim();
      var contact = field('contact').value.trim();
      var selected = city ? city.value : '';
      var extra = other ? other.value.trim() : '';
      if (selected === 'other') selected = extra;
      var languageField = field('language');
      var language = languageField && languageField.value === 'en' ? 'en' : 'zh';
      var payload = {
        name: name,
        contact: contact,
        city: selected.trim(),
        service: (field('service') && field('service').value) || 'letting',
        language: language,
        contactMethod: 'phone',
        requestId: currentId(false),
      };
      var website = field('website');
      if (website && website.value) payload.website = website.value;
      var signature = JSON.stringify({ name: payload.name, contact: payload.contact, city: payload.city, service: payload.service, language: payload.language });
      if (lastSignature && lastSignature !== signature) payload.requestId = currentId(true);
      lastSignature = signature;
      if (requestField) requestField.value = payload.requestId;
      sending = true;
      if (button) button.disabled = true;
      showStatus(language === 'en' ? 'Sending…' : '正在发送…', false);
      fetch('/api/leads', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (response) {
        if (response.status === 409) {
          currentId(true);
          showStatus(language === 'en' ? 'Please send this enquiry again.' : '请重新发送这次咨询。', true);
          return;
        }
        if (!response.ok) {
          showStatus(language === 'en' ? 'Not sent. Check the phone number and try again.' : '没有发送成功。请检查电话号码后再试。', true);
          return;
        }
        form.hidden = true;
        var lead = form.parentElement && form.parentElement.querySelector('.eucove-callback-lead');
        if (lead) lead.hidden = true;
        showStatus(language === 'en' ? 'Received. We will call you about the rent.' : '已收到。我们会用这个电话联系您评估租金。', false);
        fireLead(payload.requestId);
      }).catch(function () {
        showStatus(language === 'en' ? 'The network is unavailable. Your details are still here; please try again.' : '网络暂时不可用。填写的内容都还在，请再试一次。', true);
      }).then(function () {
        sending = false;
        if (button) button.disabled = false;
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

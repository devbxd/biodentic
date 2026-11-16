(function () {
  'use strict';
  // v2: bumped to reset everyone, and moved to a domain-wide cookie so
  // www.biodentic.pro and biodentic.pro share the same "already seen" state
  // (localStorage alone is scoped per-hostname, so www and apex disagreed).
  var STORAGE_KEY = 'biodentic_visitor_registered_v2';
  var COOKIE_NAME = 'biodentic_visitor_registered_v2';

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setSharedCookie(name, value) {
    var host = location.hostname;
    var parts = host.split('.');
    // use the registrable root domain (last two labels) so it's shared
    // across apex and any subdomain (e.g. www.biodentic.pro <-> biodentic.pro)
    var domain = parts.length > 2 ? parts.slice(-2).join('.') : host;
    var oneYear = 60 * 60 * 24 * 365;
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; domain=' + domain + '; path=/; max-age=' + oneYear + '; SameSite=Lax';
  }

  function markRegistered() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    setSharedCookie(COOKIE_NAME, '1');
  }

  function reveal() {
    document.documentElement.style.visibility = '';
  }

  if (getCookie(COOKIE_NAME) || localStorage.getItem(STORAGE_KEY)) {
    reveal();
    return;
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'gate-overlay';
    overlay.innerHTML =
      '<div class="gate-card">' +
        '<div class="gate-top">' +
          '<div class="gate-logo-badge"><img src="/assets/favicon-icon.png" alt=""></div>' +
        '</div>' +
        '<div class="gate-body">' +
          '<h1>Welcome to Biodentic</h1>' +
          '<p class="gate-sub">Please enter your details to access our catalog.</p>' +
          '<p class="gate-error" id="gate-error"></p>' +
          '<form id="gate-form">' +
            '<div class="gate-field">' +
              '<label for="gate-name">Doctor name</label>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
              '<input type="text" id="gate-name" autocomplete="name" required>' +
            '</div>' +
            '<div class="gate-field">' +
              '<label for="gate-phone">Phone number</label>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
              '<input type="tel" id="gate-phone" autocomplete="tel" required>' +
            '</div>' +
            '<button type="submit" id="gate-submit">' +
              '<span id="gate-submit-label">Access the site</span>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
            '</button>' +
          '</form>' +
          '<div class="gate-trust">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
            'Your information stays private' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    reveal();

    var form = document.getElementById('gate-form');
    var errorEl = document.getElementById('gate-error');
    var submitBtn = document.getElementById('gate-submit');
    var submitLabel = document.getElementById('gate-submit-label');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var doctorName = document.getElementById('gate-name').value.trim();
      var phone = document.getElementById('gate-phone').value.trim();
      if (!doctorName || !phone) return;

      errorEl.classList.remove('visible');
      submitBtn.disabled = true;
      submitLabel.textContent = 'Please wait…';

      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorName: doctorName, phone: phone })
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      }).then(function () {
        markRegistered();
        overlay.remove();
      }).catch(function () {
        errorEl.textContent = 'Something went wrong. Please try again.';
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitLabel.textContent = 'Access the site';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildOverlay);
  } else {
    buildOverlay();
  }
})();

(function () {
  'use strict';
  var STORAGE_KEY = 'biodentic_visitor_registered';

  function reveal() {
    document.documentElement.style.visibility = '';
  }

  if (localStorage.getItem(STORAGE_KEY)) {
    reveal();
    return;
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'gate-overlay';
    overlay.innerHTML =
      '<div class="gate-card">' +
        '<img class="gate-logo" src="/assets/logo-mark.svg" alt="">' +
        '<h1>Welcome to Biodentic</h1>' +
        '<p class="gate-sub">Please enter your details to access our catalog.</p>' +
        '<p class="gate-error" id="gate-error"></p>' +
        '<form id="gate-form">' +
          '<label for="gate-name">Doctor name</label>' +
          '<input type="text" id="gate-name" autocomplete="name" required>' +
          '<label for="gate-phone">Phone number</label>' +
          '<input type="tel" id="gate-phone" autocomplete="tel" required>' +
          '<button type="submit" id="gate-submit">Access the site</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);
    reveal();

    var form = document.getElementById('gate-form');
    var errorEl = document.getElementById('gate-error');
    var submitBtn = document.getElementById('gate-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var doctorName = document.getElementById('gate-name').value.trim();
      var phone = document.getElementById('gate-phone').value.trim();
      if (!doctorName || !phone) return;

      errorEl.classList.remove('visible');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait…';

      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorName: doctorName, phone: phone })
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      }).then(function () {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
        overlay.remove();
      }).catch(function () {
        errorEl.textContent = 'Something went wrong. Please try again.';
        errorEl.classList.add('visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Access the site';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildOverlay);
  } else {
    buildOverlay();
  }
})();

(function () {
  'use strict';
  document.documentElement.style.visibility = 'hidden';

  function mount() {
    var overlay = document.createElement('div');
    overlay.id = 'maintenance-overlay';
    overlay.innerHTML =
      '<div class="maint-card">' +
        '<img src="/assets/favicon-icon.png" alt="" class="maint-logo">' +
        '<h1>We\'ll be right back</h1>' +
        '<p>We\'re currently updating our site for the holiday season.<br>We\'ll be back shortly — thank you for your patience.</p>' +
      '</div>';
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

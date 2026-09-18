// Biodentic — interactions front-end (site statique, sans backend)

// Top loading bar — runs immediately, before DOMContentLoaded, for a snappy feel
(function () {
  var bar = document.createElement('div');
  bar.id = 'top-load-bar';
  document.documentElement.appendChild(bar);
  requestAnimationFrame(function () { bar.style.width = '35%'; });
  setTimeout(function () { bar.style.width = '70%'; }, 180);
  function finish() {
    bar.style.width = '100%';
    setTimeout(function () {
      bar.classList.add('done');
      setTimeout(function () { bar.remove(); }, 500);
    }, 200);
  }
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish);
})();

document.addEventListener('DOMContentLoaded', () => {

  // Floating WhatsApp button (all pages)
  if (!document.getElementById('floating-whatsapp')) {
    const fw = document.createElement('a');
    fw.id = 'floating-whatsapp';
    fw.href = 'https://wa.me/96171844249';
    fw.target = '_blank';
    fw.rel = 'noopener';
    fw.setAttribute('aria-label', 'Message us on WhatsApp');
    fw.innerHTML = '<span class="fw-ping"></span>' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5C10 9 9.4 7.6 9.1 7c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3s1 2.7 1.1 2.9c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.1-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';
    document.body.appendChild(fw);
  }

  // Scroll-reveal animations
  const revealTargets = document.querySelectorAll(
    '.cat-card, .product-card, .category-card, .section-head, .stat, .cta-band, .faq-item, .hero-trust .item'
  );
  if (revealTargets.length && 'IntersectionObserver' in window) {
    let i = 0;
    revealTargets.forEach(el => {
      el.classList.add('reveal', 'reveal-stagger');
      el.style.setProperty('--reveal-i', i % 6);
      i++;
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(el => io.observe(el));
  }

  // Animated stat counters (e.g. "1800+", "100%", "24h")
  document.querySelectorAll('.strip .stat b').forEach(el => {
    const raw = el.textContent.trim();
    const match = raw.match(/^([\d,.]+)(.*)$/);
    if (!match) return;
    const target = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2];
    if (isNaN(target)) return;
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !started) {
          started = true;
          const duration = 1200;
          const startTime = performance.now();
          function tick(now) {
            const p = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            const val = Math.round(target * eased);
            el.textContent = val.toLocaleString() + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = raw;
          }
          requestAnimationFrame(tick);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });

  // Année dynamique dans le footer
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  // Menu mobile
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-nav-close');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => mobileNav.classList.add('open'));
    mobileClose?.addEventListener('click', () => mobileNav.classList.remove('open'));
    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) mobileNav.classList.remove('open');
    });
  }

  // Ombre du header au scroll
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 8 ? '0 2px 14px rgba(12,32,56,.08)' : 'none';
    });
  }

  // Accordéon FAQ
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Filtre de catégories (page catalogue)
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('[data-category]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      productCards.forEach(card => {
        const show = cat === 'all' || card.dataset.category === cat;
        card.style.display = show ? '' : 'none';
      });
    });
  });

});

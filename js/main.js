// Biodentic — interactions front-end (site statique, sans backend)

document.addEventListener('DOMContentLoaded', () => {

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

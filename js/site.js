/* Shared static site behaviors */

function setActiveNav() {
  const page = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  const activePage = page === 'vard.html' ? 'tatuering.html' : page;

  document.querySelectorAll('.site-nav__link').forEach((link) => {
    const target = (link.getAttribute('data-page') || link.getAttribute('href').split('/').pop() || '').trim();
    if (target === activePage) {
      link.classList.add('active');
    }
  });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  els.forEach((el) => obs.observe(el));
}

function syncHeaderHeight() {
  const header = document.getElementById('site-header-el');
  if (!header) return;
  const height = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-height', `${height}px`);
}

function initHeader() {
  const hd = document.getElementById('site-header-el');
  if (!hd) return;

  syncHeaderHeight();

  const onScroll = () => {
    hd.classList.toggle('is-scrolled', window.scrollY > 50);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', syncHeaderHeight, { passive: true });
  window.addEventListener('load', syncHeaderHeight, { passive: true });

  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuToggle = document.getElementById('menu-toggle');

  if (mobileToggle) {
    const syncMobileMenuFocusability = (isOpen) => {
      if (!mobileMenu) return;
      mobileMenu.toggleAttribute('inert', !isOpen);
      mobileMenu.querySelectorAll('a').forEach((link) => {
        if (isOpen) {
          link.removeAttribute('tabindex');
        } else {
          link.setAttribute('tabindex', '-1');
        }
      });
    };

    const syncMobileMenuState = () => {
      const isOpen = mobileToggle.checked;
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      if (mobileMenu) mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      if (menuToggle) menuToggle.setAttribute('aria-label', isOpen ? 'Stäng meny' : 'Öppna meny');
      syncMobileMenuFocusability(isOpen);
    };

    mobileToggle.addEventListener('change', syncMobileMenuState);
    syncMobileMenuState();
  }

  onScroll();
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initHeader();
  initReveal();
  document.body.classList.add('ready');
});

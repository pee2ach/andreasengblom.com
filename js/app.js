/* ─── Shared App Logic ───────────────────────────────────────── */

/* =========================================================================
 * Inject shared partials (header + footer)
 * ========================================================================= */
async function injectPartials() {
  const [headerHTML, footerHTML] = await Promise.all([
    fetch('/partials/header.html', { cache: 'no-store' }).then(r => r.text()),
    fetch('/partials/footer.html', { cache: 'no-store' }).then(r => r.text()),
  ]);

  const headerSlot = document.getElementById('site-header-slot');
  const footerSlot = document.getElementById('site-footer-slot');

  if (headerSlot) headerSlot.outerHTML = headerHTML;
  if (footerSlot) footerSlot.outerHTML = footerHTML;
}

// Inject before DOMContentLoaded listeners run
injectPartials().then(() => {
  setActiveNav();
  syncHeaderHeight();
  document.dispatchEvent(new Event('partials-ready'));
  document.body.classList.add('ready');
});


/* =========================================================================
 * Fetch and cache portfolio.json
 * ========================================================================= */
let _tattoosCache = null;
async function fetchTattoos() {
  if (_tattoosCache) return _tattoosCache;
  const res = await fetch('/portfolio.json');
  const data = await res.json();
  _tattoosCache = data.tattoos;
  return _tattoosCache;
}

/**
 * Encode an image path safely for use in src attributes
 * Handles Swedish chars (å,ä,ö) and spaces in filenames
 */
function imgSrc(path) {
  const parts = path.split('/');
  return parts.map(p => encodeURIComponent(p).replace(/%2F/g, '/')).join('/');
}

const RESPONSIVE_IMAGE_PROFILES = {
  portfolioCard: {
    widths: [480, 768, 1200],
    sizes: '(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw',
  },
  tattooGrid: {
    widths: [768, 1200],
    sizes: '(min-width: 1024px) 58vw, 100vw',
  },
  lightbox: {
    widths: [768, 1200],
    sizes: '100vw',
  },
};

function publicImagePath(path) {
  const trimmed = path.replace(/^\/+/, '');
  const withoutRaw = trimmed.replace(/^_raw\//, '');
  const webpPath = withoutRaw.replace(/\.(jpe?g|png)$/i, '.webp');
  return `/${webpPath}`;
}

function responsiveVariantPath(path, width) {
  return publicImagePath(path).replace(/\.webp$/i, `-${width}.webp`);
}

function responsiveImageData(path, profile) {
  const fallbackWidth = profile.widths[profile.widths.length - 1];
  return {
    src: imgSrc(responsiveVariantPath(path, fallbackWidth)),
    srcset: profile.widths.map(width => `${imgSrc(responsiveVariantPath(path, width))} ${width}w`).join(', '),
    sizes: profile.sizes,
  };
}

/**
 * Set active nav link based on current page filename
 */
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const activePage = page === 'vard.html' ? 'tatuering.html' : page;
  document.querySelectorAll('.site-nav__link').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === activePage) link.classList.add('active');
  });
}

/**
 * Menyn rendras nu statiskt och inte via app.js
 */
function buildMasonryItem(tattoo) {
  const item = document.createElement('div');
  item.className = 'mb-6 md:mb-8 break-inside-avoid relative overflow-hidden rounded-md group bg-stone-100 cursor-pointer reveal photo-card';
  const _cats = { 'geometri-och-ornament': 'Geometri & Ornament', 'motiv-och-symbolik': 'Motiv & Symbolik', 'cover-ups': 'Cover-Ups' };
  const catLabel = _cats[tattoo.category] || tattoo.category;
  const image = responsiveImageData(tattoo.thumbnail, RESPONSIVE_IMAGE_PROFILES.portfolioCard);
  item.innerHTML = `
    <img src="${image.src}" srcset="${image.srcset}" sizes="${image.sizes}" alt="${tattoo.title}" loading="lazy" class="w-full h-auto block rounded-md transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] saturate-[0.9] group-hover:scale-105 group-hover:saturate-100">
    <div class="absolute inset-0 bg-gradient-to-t from-overlay via-overlay/70 via-[40%] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
      <span class="font-serif font-light text-lg tracking-[0.04em] text-stone-100 leading-snug translate-y-2 group-hover:translate-y-0 transition-transform duration-500">${tattoo.title}</span>
      <span class="text-[0.6rem] tracking-[0.4em] uppercase text-brand mt-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-75">${catLabel}</span>
    </div>
  `;
  item.addEventListener('click', () => {
    location.href = `/tattoo.html?id=${tattoo.id}`;
  });
  return item;
}

/**
 * Render a masonry grid into a container element
 */
function renderMasonry(tattoos, container) {
  container.innerHTML = '';
  if (tattoos.length === 0) {
    container.innerHTML = '<p class="text-center text-stone-400 py-16">Inga tatueringar hittades.</p>';
    return;
  }
  tattoos.forEach(t => container.appendChild(buildMasonryItem(t)));
  initReveal();
}

/* =========================================================================
 * Articles
 * ========================================================================= */
let _articlesCache = null;
async function fetchArticles() {
  if (_articlesCache) return _articlesCache;
  const res = await fetch('/articles.json');
  const data = await res.json();
  _articlesCache = data.articles;
  return _articlesCache;
}

function formatArticleDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function articleReadingTime(article) {
  const text = (article.body_before + ' ' + article.body_after)
    .replace(/<[^>]+>/g, '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min';
}

function buildArticleCard(article) {
  const el = document.createElement('article');
  el.className = 'group cursor-pointer reveal';
  const date = formatArticleDate(article.published_date);
  el.innerHTML = `
    <div class="relative overflow-hidden rounded-md photo-card mb-5">
      <img src="${imgSrc(article.card_src)}" alt="${article.title}" loading="lazy"
           class="w-full h-[240px] md:h-[340px] object-cover block transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] saturate-[0.9] group-hover:scale-105 group-hover:saturate-100">
    </div>
    <div>
      <span class="text-[0.6rem] tracking-[0.35em] uppercase text-stone-400 block mb-3">${date}</span>
      <h2 class="font-serif font-light text-[1.5rem] md:text-[1.8rem] tracking-[0.02em] text-stone-800 leading-[1.2] mb-4 transition-colors duration-300 group-hover:text-brand">${article.title}</h2>
      <p class="text-[0.95rem] text-stone-700 leading-loose mb-5 max-w-prose">${article.excerpt}</p>
      <span class="text-[0.6rem] tracking-[0.3em] uppercase text-brand">Läs artikel →</span>
    </div>
  `;
  el.addEventListener('click', () => { location.href = `/artikel.html?slug=${article.slug}`; });
  return el;
}

function renderArticleCards(articles, container) {
  container.innerHTML = '';
  if (!articles.length) {
    container.innerHTML = '<p class="text-center text-stone-400 py-16">Inga artiklar hittades.</p>';
    return;
  }
  articles.forEach(a => container.appendChild(buildArticleCard(a)));
  initReveal();
}

function renderArticle(article, container) {
  const date = formatArticleDate(article.published_date);
  const readTime = articleReadingTime(article);

  // Update page-level meta
  document.title = article.title + ' – Andreas Engblom';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', article.excerpt);

  container.innerHTML = `
    <div class="article-hero reveal">
      <img src="${imgSrc(article.hero_src)}"
           srcset="${article.hero_srcset}"
           sizes="(min-width: 1400px) 1240px, calc(100vw - 3rem)"
           alt="${article.title}"
           class="article-hero__image">
      <div class="article-hero__overlay"></div>
    </div>

    <div class="max-w-2xl mx-auto">
      <p class="text-[0.65rem] md:text-[0.73rem] tracking-[0.38em] uppercase text-brand mb-3 reveal">Artikel</p>
      <h1 class="font-serif font-light text-[2.5rem] md:text-[4.5rem] tracking-[0.04em] text-stone-800 leading-[1.05] mb-6 reveal">${article.title}</h1>

      <div class="flex items-center gap-5 mb-8 reveal">
        <span class="text-[0.6rem] tracking-[0.3em] uppercase text-stone-400">${date}</span>
        <span class="text-[0.6rem] text-stone-300">·</span>
        <span class="text-[0.6rem] tracking-[0.3em] uppercase text-stone-400">${readTime} läsning</span>
      </div>

      <div class="article-divider mb-10 md:mb-14 reveal"></div>

      <p class="text-[1.1rem] md:text-[1.35rem] font-serif tracking-[0.02em] text-stone-800 leading-[1.8] mb-12 md:mb-16 reveal">${article.excerpt}</p>

      <div class="article-body reveal">
        ${article.body_before}
        <figure class="article-figure">
          <div class="relative overflow-hidden rounded-md photo-card">
            <img src="${imgSrc(article.inline_src)}"
                 alt="${article.inline_caption}"
                 loading="lazy"
                 class="w-full h-auto block">
          </div>
          <figcaption class="article-figcaption">${article.inline_caption}</figcaption>
        </figure>
        ${article.body_after}
      </div>

      <div class="article-divider mt-16 mb-12 reveal"></div>

      <div class="flex flex-wrap gap-4 reveal">
        <a href="/artiklar.html" class="btn btn-standard">← Alla artiklar</a>
        <a href="/kontakt.html" class="btn btn-accent">Kontakta mig</a>
      </div>
    </div>
  `;
  initReveal();
}

/**
 * Get a query string parameter by name
 */
function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/**
 * Intersection Observer — scroll reveal for .reveal elements
 */
function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  els.forEach(el => obs.observe(el));
}

// Run reveal on DOM ready (for static .reveal elements)
document.addEventListener('DOMContentLoaded', initReveal);

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
    const syncMobileMenuState = () => {
      const isOpen = mobileToggle.checked;
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      if (mobileMenu) mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      if (menuToggle) {
        menuToggle.setAttribute('aria-label', isOpen ? 'Stäng meny' : 'Öppna meny');
      }
    };

    mobileToggle.addEventListener('change', syncMobileMenuState);
    syncMobileMenuState();
  }

  onScroll();
}

// Init header after partials are injected
document.addEventListener('partials-ready', () => {
  initHeader();
});

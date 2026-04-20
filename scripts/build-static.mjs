import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://andreasengblom.com';

const CATEGORY_LABELS = {
  'geometri-och-ornament': 'Geometri & Ornament',
  'motiv-och-symbolik': 'Motiv & Symbolik',
  'cover-ups': 'Cover-Ups',
};

const CATEGORY_META = {
  '': {
    title: 'Portfolio',
    subtitle: 'Utvalda arbeten',
    description: 'Här hittar du ett urval av mina tatueringar. Varje kategori visar en egen del av mitt uttryck - från noggrann geometri och ornament till figurativa motiv och genomtänkta cover-ups.',
  },
  'geometri-och-ornament': {
    title: 'Geometri & Ornament',
    subtitle: 'Mandala, dotwork och geometriska kompositioner',
    description: 'Geometri bygger på mönster, symmetri och exakta linjer där formerna samspelar över kroppen. Ornament är mer dekorativt och organiskt, ofta inspirerat av mandala, textila mönster och klassiska detaljer. Här visar jag geometriska och ornamentala tatueringar med dotwork, linjearbete och tydligt flöde.',
  },
  'motiv-och-symbolik': {
    title: 'Motiv & Symbolik',
    subtitle: 'Figurativa motiv, realism och personliga symboler',
    description: 'Motiv och symbolik handlar om tatueringar med personlig betydelse. Det kan vara figurativa motiv, realism eller symboler som bär en historia. Här samlar jag arbeten där vi utvecklat idé, form och placering tillsammans för att skapa en tatuering med både känsla och balans.',
  },
  'cover-ups': {
    title: 'Cover-Ups',
    subtitle: 'Förvandla ett gammalt motiv till ett nytt konstverk',
    description: 'En cover-up är en tatuering som täcker eller bygger om en äldre tatuering. Målet är inte bara att dölja, utan att skapa ett nytt motiv som fungerar långsiktigt. Här visar jag cover-up tatueringar där jag jobbar med kontrast, djup, form och placering för ett naturligt helhetsintryck.',
  },
};

function read(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

function writeDist(filePath, content) {
  const fullPath = path.join(DIST, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function rmDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyDir(name) {
  const src = path.join(ROOT, name);
  const dst = path.join(DIST, name);
  if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true });
}

function removeIfExists(filePath) {
  const fullPath = path.join(DIST, filePath);
  if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { force: true });
}

function escapeHtml(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(input = '') {
  return escapeHtml(input).replace(/`/g, '&#96;');
}

function encodePath(p = '') {
  const normalized = p.normalize('NFC').replace(/^\/+/, '');
  if (!normalized) return '/';
  return `/${normalized.split('/').map((part) => encodeURIComponent(part.normalize('NFC'))).join('/')}`;
}

function publicImagePath(p = '') {
  const trimmed = p.normalize('NFC').replace(/^\/+/, '').replace(/^_raw\//, '');
  if (/\.(jpe?g|png)$/i.test(trimmed)) return `/${trimmed.replace(/\.(jpe?g|png)$/i, '.webp')}`;
  return `/${trimmed}`;
}

function responsiveVariantPath(p, width) {
  return publicImagePath(p).replace(/\.webp$/i, `-${width}.webp`);
}

function responsiveImageData(p, widths, sizes) {
  const fallbackWidth = widths[widths.length - 1];
  return {
    src: encodePath(responsiveVariantPath(p, fallbackWidth)),
    srcset: widths.map((w) => `${encodePath(responsiveVariantPath(p, w))} ${w}w`).join(', '),
    sizes,
  };
}

function formatDateSv(dateStr) {
  return new Date(dateStr).toLocaleDateString('sv-SE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function readingTime(article) {
  const text = `${article.body_before || ''} ${article.body_after || ''}`.replace(/<[^>]+>/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}

function markActiveLinks(markup, pageName) {
  const escaped = pageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`class=\"([^\"]*\\bsite-nav__link\\b[^\"]*)\"\\s+data-page=\"${escaped}\"`, 'g');
  return markup.replace(re, (_full, classNames) => {
    if (classNames.includes(' active')) return `class="${classNames}" data-page="${pageName}"`;
    return `class="${classNames} active" data-page="${pageName}"`;
  });
}

function hydrateShell(html, pageName) {
  const header = markActiveLinks(read('partials/header.html'), pageName);
  const footer = read('partials/footer.html');

  return html
    .replace('<div id="site-header-slot"></div>', header)
    .replace('<div id="site-footer-slot"></div>', footer)
    .replace(/<script src=\"\/js\/app\.js[^\"]*\"><\/script>/g, '<script src="/js/site.js"></script>');
}

function pageChrome({ title, description, activePage, bodyMain, afterMainScripts = '' }) {
  const header = markActiveLinks(read('partials/header.html'), activePage);
  const footer = read('partials/footer.html');

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body class="bg-color text-stone-800 font-sans font-light text-[18px] leading-[1.65] min-h-screen overflow-x-hidden antialiased">
${header}
${bodyMain}
${footer}
<script src="/js/site.js"></script>
${afterMainScripts}
</body>
</html>
`;
}

function renderTattooCard(tattoo) {
  const label = CATEGORY_LABELS[tattoo.category] || tattoo.category || '';
  const image = responsiveImageData(tattoo.thumbnail, [480, 768, 1200], '(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw');

  return `<a href="/tattoo/${encodeURIComponent(tattoo.id)}/" class="mb-6 md:mb-8 break-inside-avoid relative overflow-hidden rounded-md group bg-stone-100 cursor-pointer reveal photo-card block" data-cat="${escapeAttr(tattoo.category || '')}" data-featured="${tattoo.featured ? '1' : '0'}">
    <img src="${image.src}" srcset="${image.srcset}" sizes="${image.sizes}" alt="${escapeAttr(tattoo.title)}" loading="lazy" class="w-full h-auto block rounded-md transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] saturate-[0.9] group-hover:scale-105 group-hover:saturate-100">
    <div class="absolute inset-0 bg-gradient-to-t from-overlay via-overlay/70 via-[40%] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
      <span class="font-serif font-light text-lg tracking-[0.04em] text-stone-100 leading-snug translate-y-2 group-hover:translate-y-0 transition-transform duration-500">${escapeHtml(tattoo.title)}</span>
      <span class="text-[0.6rem] tracking-[0.4em] uppercase text-brand mt-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-75">${escapeHtml(label)}</span>
    </div>
  </a>`;
}

function buildIndexPage(tattoos) {
  const featured = tattoos
    .filter((t) => t.featured)
    .sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999))
    .slice(0, 6);

  const cards = featured.map(renderTattooCard).join('\n');
  const template = read('index.html')
    .replace(/<div class="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-8" id="featured-masonry">[\s\S]*?<\/div>/, `<div class="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-8" id="featured-masonry">\n${cards}\n</div>`)
    .replace(/<script src="\/js\/app\.js"><\/script>[\s\S]*?<\/script>/, '<script src="/js/site.js"></script>');

  return hydrateShell(template, 'index.html');
}

function buildPortfolioPage(tattoos) {
  const cards = tattoos
    .slice()
    .sort((a, b) => {
      const f = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (f !== 0) return f;
      return (a.title || '').localeCompare(b.title || '', 'sv');
    })
    .map(renderTattooCard)
    .join('\n');

  const metaJson = JSON.stringify(CATEGORY_META).replace(/</g, '\\u003c');

  const bodyMain = `<main>
  <div class="w-full max-w-[1400px] mx-auto px-6 md:px-20">
    <div class="page-content-offset pb-24 md:pb-48">
      <div class="mb-8 md:mb-10">
        <h1 class="font-serif font-light text-[2.5rem] md:text-[4.5rem] tracking-[0.04em] text-stone-800 leading-[1.05] mb-2" id="page-title">Portfolio</h1>
        <p class="text-[0.65rem] md:text-[0.73rem] tracking-[0.38em] uppercase text-brand mb-3" id="page-subtitle">Utvalda arbeten</p>
        <p class="max-w-[78ch] text-[1rem] md:text-[1.08rem] leading-[1.9] text-stone-700" id="page-description">Här hittar du ett urval av mina tatueringar. Varje kategori visar en egen del av mitt uttryck - från noggrann geometri och ornament till figurativa motiv och genomtänkta cover-ups.</p>
        <div class="h-[1px] bg-gradient-to-r from-brand to-sage my-6 md:my-8"></div>
      </div>

      <div class="flex flex-wrap gap-2 mb-12 md:mb-20" id="cat-tabs">
        <button class="category-tab btn btn-filter" data-cat="">Utvalda</button>
        <button class="category-tab btn btn-filter" data-cat="geometri-och-ornament">Geometri &amp; Ornament</button>
        <button class="category-tab btn btn-filter" data-cat="motiv-och-symbolik">Motiv &amp; Symbolik</button>
        <button class="category-tab btn btn-filter" data-cat="cover-ups">Cover-Ups</button>
      </div>

      <div class="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-8" id="masonry-grid">
        ${cards}
      </div>
    </div>
  </div>
</main>`;

  const script = `<script>
(() => {
  const META = ${metaJson};
  const cards = Array.from(document.querySelectorAll('#masonry-grid [data-cat]'));
  const tabs = Array.from(document.querySelectorAll('#cat-tabs .category-tab'));
  const title = document.getElementById('page-title');
  const subtitle = document.getElementById('page-subtitle');
  const desc = document.getElementById('page-description');

  function applyCat(cat) {
    tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.cat === cat));

    const meta = META[cat] || META[''];
    title.textContent = meta.title;
    subtitle.textContent = meta.subtitle;
    desc.textContent = meta.description;

    cards.forEach((card) => {
      const matches = !cat
        ? card.getAttribute('data-featured') === '1'
        : card.getAttribute('data-cat') === cat;
      card.classList.toggle('hidden', !matches);
    });

    const url = cat ? '/portfolio.html?cat=' + encodeURIComponent(cat) : '/portfolio.html';
    history.replaceState(null, '', url);
  }

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => applyCat(btn.dataset.cat || ''));
  });

  const initialCat = new URLSearchParams(location.search).get('cat') || '';
  applyCat(initialCat);
})();
</script>`;

  return pageChrome({
    title: 'Portfolio - Andreas Engblom Tatuerare',
    description: 'Portfolio av tatueringar av Andreas Engblom med utvalda arbeten inom geometri, ornament, motiv, symbolik och cover-ups.',
    activePage: 'portfolio.html',
    bodyMain,
    afterMainScripts: script,
  });
}

function buildArticleListPage(articles) {
  const sorted = articles.slice().sort((a, b) => new Date(b.published_date) - new Date(a.published_date));
  const cards = sorted.map((article) => {
    return `<article class="group reveal">
      <a href="/artiklar/${encodeURIComponent(article.slug)}/" class="block">
        <div class="relative overflow-hidden rounded-md photo-card mb-5">
          <img src="${encodePath(article.card_src)}" alt="${escapeAttr(article.title)}" loading="lazy" class="w-full h-[240px] md:h-[340px] object-cover block transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] saturate-[0.9] group-hover:scale-105 group-hover:saturate-100">
        </div>
        <div>
          <span class="text-[0.6rem] tracking-[0.35em] uppercase text-stone-400 block mb-3">${escapeHtml(formatDateSv(article.published_date))}</span>
          <h2 class="font-serif font-light text-[1.5rem] md:text-[1.8rem] tracking-[0.02em] text-stone-800 leading-[1.2] mb-4 transition-colors duration-300 group-hover:text-brand">${escapeHtml(article.title)}</h2>
          <p class="text-[0.95rem] text-stone-700 leading-loose mb-5 max-w-prose">${escapeHtml(article.excerpt)}</p>
          <span class="text-[0.6rem] tracking-[0.3em] uppercase text-brand">Läs artikel →</span>
        </div>
      </a>
    </article>`;
  }).join('\n');

  const bodyMain = `<main>
  <div class="w-full max-w-[1400px] mx-auto px-6 md:px-20">
    <div class="page-content-offset pb-24 md:pb-48">
      <h1 class="font-serif font-light text-[2.5rem] md:text-[4.5rem] tracking-[0.04em] text-stone-800 leading-[1.05] mb-2">Artiklar</h1>
      <p class="text-[0.65rem] md:text-[0.73rem] tracking-[0.38em] uppercase text-brand mb-3">Tankar &amp; Berättelser</p>
      <div class="article-divider my-6 md:my-8"></div>

      <div class="max-w-2xl mb-16 md:mb-24">
        <p class="text-[1rem] md:text-[1.1rem] text-stone-700 leading-loose">
          Här samlar jag texter om tatueringskonsten - om teknik, om symbolik, om de möten som uppstår i stolen. Inte instruktioner, utan reflektioner.
        </p>
      </div>

      <div id="article-grid" class="grid md:grid-cols-2 gap-8 md:gap-12">
        ${cards}
      </div>
    </div>
  </div>
</main>`;

  return pageChrome({
    title: 'Artiklar - Andreas Engblom',
    description: 'Tankar, reflektioner och berättelser om tatueringskonsten av Andreas Engblom, tatuerare i Stockholm.',
    activePage: 'artiklar.html',
    bodyMain,
  });
}

function buildArticlePage(article) {
  const bodyMain = `<main>
  <div class="w-full max-w-[1400px] mx-auto px-6 md:px-20">
    <div class="page-content-offset pb-24 md:pb-48">
      <div class="article-hero reveal">
        <img src="${encodePath(article.hero_src)}" srcset="${escapeAttr(article.hero_srcset)}" sizes="(min-width: 1400px) 1240px, calc(100vw - 3rem)" alt="${escapeAttr(article.title)}" class="article-hero__image">
        <div class="article-hero__overlay"></div>
      </div>

      <div class="max-w-2xl mx-auto">
        <p class="text-[0.65rem] md:text-[0.73rem] tracking-[0.38em] uppercase text-brand mb-3 reveal">Artikel</p>
        <h1 class="font-serif font-light text-[2.5rem] md:text-[4.5rem] tracking-[0.04em] text-stone-800 leading-[1.05] mb-6 reveal">${escapeHtml(article.title)}</h1>

        <div class="flex items-center gap-5 mb-8 reveal">
          <span class="text-[0.6rem] tracking-[0.3em] uppercase text-stone-400">${escapeHtml(formatDateSv(article.published_date))}</span>
          <span class="text-[0.6rem] text-stone-300">·</span>
          <span class="text-[0.6rem] tracking-[0.3em] uppercase text-stone-400">${escapeHtml(readingTime(article))} läsning</span>
        </div>

        <div class="article-divider mb-10 md:mb-14 reveal"></div>

        <p class="text-[1.1rem] md:text-[1.35rem] font-serif tracking-[0.02em] text-stone-800 leading-[1.8] mb-12 md:mb-16 reveal">${escapeHtml(article.excerpt)}</p>

        <div class="article-body reveal">
          ${article.body_before}
          <figure class="article-figure">
            <div class="relative overflow-hidden rounded-md photo-card">
              <img src="${encodePath(article.inline_src)}" alt="${escapeAttr(article.inline_caption)}" loading="lazy" class="w-full h-auto block">
            </div>
            <figcaption class="article-figcaption">${escapeHtml(article.inline_caption)}</figcaption>
          </figure>
          ${article.body_after}
        </div>

        <div class="article-divider mt-16 mb-12 reveal"></div>

        <div class="flex flex-wrap gap-4 reveal">
          <a href="/artiklar.html" class="btn btn-standard">← Alla artiklar</a>
          <a href="/kontakt.html" class="btn btn-accent">Kontakta mig</a>
        </div>
      </div>
    </div>
  </div>
</main>`;

  return pageChrome({
    title: `${article.title} - Andreas Engblom`,
    description: article.excerpt,
    activePage: 'artiklar.html',
    bodyMain,
  });
}

function buildTattooPage(tattoo) {
  const label = CATEGORY_LABELS[tattoo.category] || tattoo.category || 'Portfolio';
  const catUrl = tattoo.category ? `/portfolio.html?cat=${encodeURIComponent(tattoo.category)}` : '/portfolio.html';
  const styles = (tattoo.style || []).map((styleName) => `<span class="text-[0.6rem] md:text-[0.68rem] tracking-[0.2em] uppercase text-brand border border-brand/30 px-4 py-1.5">${escapeHtml(styleName)}</span>`).join('');

  const imageBlocks = (tattoo.images || []).map((img, index) => {
    const image = responsiveImageData(img, [768, 1200], '(min-width: 1024px) 58vw, 100vw');
    return `<div class="mb-5 md:mb-8 break-inside-avoid relative overflow-hidden cursor-zoom-in bg-stone-100 group reveal photo-card" data-idx="${index}">
      <img class="w-full h-auto block transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] saturate-[0.88] group-hover:scale-105 group-hover:saturate-100 rounded-md" src="${image.src}" srcset="${image.srcset}" sizes="${image.sizes}" alt="${escapeAttr(`${tattoo.title} - bild ${index + 1}`)}" loading="${index < 2 ? 'eager' : 'lazy'}">
      <span class="absolute bottom-3 right-3 text-[0.55rem] md:text-[0.6rem] tracking-[0.3em] uppercase text-stone-100/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">${String(index + 1).padStart(2, '0')}</span>
    </div>`;
  }).join('\n');

  const lightboxImages = JSON.stringify((tattoo.images || []).map((img) => {
    const data = responsiveImageData(img, [768, 1200], '100vw');
    return data;
  })).replace(/</g, '\\u003c');

  const bodyMain = `<main>
  <div class="w-full max-w-[1400px] mx-auto px-6 md:px-20">
    <div class="page-content-offset pb-24 md:pb-48">
      <div class="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 lg:gap-24 items-start">
        <div class="sticky top-[calc(100px+2.5rem)] pt-1">
          <a href="${catUrl}" class="inline-flex items-center gap-3 text-[0.65rem] md:text-[0.73rem] tracking-[0.3em] uppercase text-stone-600 mb-10 transition-colors duration-200 hover:text-brand">← ${escapeHtml(label)}</a>
          <h1 class="font-serif font-light text-[2rem] md:text-[3rem] tracking-[0.02em] text-stone-800 leading-[1.1] mb-4">${escapeHtml(tattoo.title)}</h1>
          <p class="text-[0.87rem] md:text-[0.98rem] text-stone-600 leading-[1.8] mb-10">${escapeHtml(tattoo.description || '')}</p>

          <div class="flex flex-col gap-4 border-t border-b border-stone-300 py-6 mb-8">
            <div class="flex justify-between items-center text-[0.75rem] md:text-[0.85rem]">
              <span class="text-stone-600 tracking-[0.1em] uppercase">Kategori</span>
              <span class="text-stone-800">${escapeHtml(label)}</span>
            </div>
            <div class="flex justify-between items-center text-[0.75rem] md:text-[0.85rem]">
              <span class="text-stone-600 tracking-[0.1em] uppercase">Placering</span>
              <span class="text-stone-800">${escapeHtml(tattoo.placement || '-')}</span>
            </div>
            <div class="flex justify-between items-center text-[0.75rem] md:text-[0.85rem]">
              <span class="text-stone-600 tracking-[0.1em] uppercase">Färgschema</span>
              <span class="text-stone-800">${escapeHtml(tattoo.color_scheme || '-')}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">${styles}</div>
        </div>

        <div class="columns-1 sm:columns-2 gap-5 md:gap-8" id="tattoo-masonry">
          ${imageBlocks}
        </div>
      </div>
    </div>
  </div>
</main>

<div class="fixed inset-0 bg-lightbox z-[999] items-center justify-center hidden [&.open]:flex" id="lightbox" role="dialog" aria-modal="true">
  <button class="fixed top-7 right-7 text-stone-100/50 text-2xl md:text-3xl cursor-pointer hover:text-stone-100 transition-colors font-sans font-light z-50 rounded-md" id="lb-close" aria-label="Stäng">&#215;</button>
  <button class="fixed left-2 top-1/2 -translate-y-1/2 text-stone-100/45 text-2xl md:text-3xl cursor-pointer p-5 hover:text-stone-100 transition-colors font-sans z-50 rounded-md" id="lb-prev" aria-label="Föregående">&#8592;</button>
  <div class="relative max-w-[90vw] max-h-[90vh]">
    <img class="max-w-[90vw] max-h-[88vh] object-contain block rounded-md" id="lb-img" src="" alt="">
  </div>
  <button class="fixed right-2 top-1/2 -translate-y-1/2 text-stone-100/45 text-2xl md:text-3xl cursor-pointer p-5 hover:text-stone-100 transition-colors font-sans z-50 rounded-md" id="lb-next" aria-label="Nästa">&#8594;</button>
  <span class="fixed bottom-7 left-1/2 -translate-x-1/2 text-[0.6rem] tracking-[0.35em] text-stone-100/40 uppercase font-sans z-50" id="lb-counter"></span>
</div>`;

  const script = `<script>
(() => {
  const images = ${lightboxImages};
  let lightboxIndex = 0;

  function updateLightbox() {
    const image = images[lightboxIndex];
    const el = document.getElementById('lb-img');
    el.src = image.src;
    el.srcset = image.srcset;
    el.sizes = image.sizes;
    document.getElementById('lb-counter').textContent = (lightboxIndex + 1) + ' / ' + images.length;
  }

  function openLightbox(index) {
    lightboxIndex = index;
    updateLightbox();
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('#tattoo-masonry [data-idx]').forEach((item) => {
    item.addEventListener('click', () => openLightbox(Number(item.getAttribute('data-idx'))));
  });

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', () => {
    lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
    updateLightbox();
  });
  document.getElementById('lb-next').addEventListener('click', () => {
    lightboxIndex = (lightboxIndex + 1) % images.length;
    updateLightbox();
  });
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightbox');
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') {
      lightboxIndex = (lightboxIndex - 1 + images.length) % images.length;
      updateLightbox();
    }
    if (e.key === 'ArrowRight') {
      lightboxIndex = (lightboxIndex + 1) % images.length;
      updateLightbox();
    }
  });
})();
</script>`;

  return pageChrome({
    title: `${tattoo.title} - Andreas Engblom`,
    description: tattoo.description || 'Tatuering av Andreas Engblom.',
    activePage: 'portfolio.html',
    bodyMain,
    afterMainScripts: script,
  });
}

function redirectPage(paramName, basePath, fallbackPath, title) {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="robots" content="noindex">
</head>
<body>
<script>
(() => {
  const v = new URLSearchParams(location.search).get('${paramName}');
  if (!v) {
    location.replace('${fallbackPath}');
    return;
  }
  location.replace('${basePath}' + encodeURIComponent(v) + '/');
})();
</script>
</body>
</html>
`;
}

function buildSitemap(tattoos, articles) {
  const urls = [
    '/',
    '/index.html',
    '/portfolio.html',
    '/tatuering.html',
    '/om-mig.html',
    '/musik.html',
    '/vard.html',
    '/kontakt.html',
    '/artiklar.html',
    ...tattoos.map((t) => `/tattoo/${encodeURIComponent(t.id)}/`),
    ...articles.map((a) => `/artiklar/${encodeURIComponent(a.slug)}/`),
  ];

  const uniqueUrls = Array.from(new Set(urls));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniqueUrls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;

  writeDist('sitemap.xml', xml);
  writeDist('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

function main() {
  rmDist();

  copyDir('assets');
  copyDir('css');
  copyDir('js');
  copyDir('tattoo-images');
  removeIfExists('js/app.js');
  removeIfExists('assets/.DS_Store');
  removeIfExists('css/.DS_Store');
  removeIfExists('tattoo-images/.DS_Store');

  const portfolio = JSON.parse(read('portfolio.json'));
  const articlesData = JSON.parse(read('articles.json'));
  const tattoos = portfolio.tattoos || [];
  const articles = articlesData.articles || [];

  const staticPages = ['om-mig.html', 'kontakt.html', 'tatuering.html', 'vard.html', 'musik.html'];
  for (const page of staticPages) {
    writeDist(page, hydrateShell(read(page), page));
  }

  writeDist('musik.json', read('musik.json'));

  writeDist('index.html', buildIndexPage(tattoos));
  writeDist('portfolio.html', buildPortfolioPage(tattoos));
  writeDist('artiklar.html', buildArticleListPage(articles));

  for (const article of articles) {
    writeDist(`artiklar/${article.slug}/index.html`, buildArticlePage(article));
  }

  for (const tattoo of tattoos) {
    writeDist(`tattoo/${tattoo.id}/index.html`, buildTattooPage(tattoo));
  }

  writeDist('artikel.html', redirectPage('slug', '/artiklar/', '/artiklar.html', 'Omdirigerar artikel'));
  writeDist('tattoo.html', redirectPage('id', '/tattoo/', '/portfolio.html', 'Omdirigerar tatuering'));

  buildSitemap(tattoos, articles);

  console.log(`Static build complete: ${tattoos.length} tattoos, ${articles.length} articles -> ${DIST}`);
}

main();

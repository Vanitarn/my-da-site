function buildSlide(rowEl, index) {
  const slide = document.createElement('li');
  slide.classList.add('ga-slide');
  slide.dataset.index = index;
  if (index === 0) slide.classList.add('active');

  const cols = [...rowEl.children];

  // col 1 — image
  const imageCol = cols[0];
  if (imageCol) {
    const picture = imageCol.querySelector('picture');
    if (picture) {
      const imgWrap = document.createElement('div');
      imgWrap.classList.add('ga-slide-image');
      imgWrap.append(picture);
      slide.append(imgWrap);
    }
  }

  // col 2 — title + description
  const contentWrap = document.createElement('div');
  contentWrap.classList.add('ga-slide-content');

  const textCol = cols[1];
  if (textCol) {
    const h2 = textCol.querySelector('h2');
    const p = textCol.querySelector('p');
    if (h2) contentWrap.append(h2);
    if (p) contentWrap.append(p);
  }

  // col 3 — cta
  const ctaCol = cols[2];
  if (ctaCol) {
    const a = ctaCol.querySelector('a');
    if (a) {
      a.classList.add('ga-slide-cta');
      contentWrap.append(a);
    }
  }

  slide.append(contentWrap);
  return slide;
}

function initCarousel(carouselBlock) {
  const rows = [...carouselBlock.querySelectorAll(':scope > div')];
  if (!rows.length) return;

  // read autoplay from col 4 of first row
  const firstRowCols = [...rows[0].children];
  const autoplay = firstRowCols[3]?.textContent?.trim() === 'true';
  const interval = 5000;

  // build slides
  const slideList = document.createElement('ul');
  slideList.classList.add('ga-carousel-slides');
  rows.forEach((row, i) => slideList.append(buildSlide(row, i)));

  // prev / next
  const prevBtn = document.createElement('button');
  prevBtn.classList.add('ga-carousel-prev');
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.innerHTML = '&#8249;';

  const nextBtn = document.createElement('button');
  nextBtn.classList.add('ga-carousel-next');
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.innerHTML = '&#8250;';

  // dots
  const dotsWrap = document.createElement('div');
  dotsWrap.classList.add('ga-carousel-dots');
  rows.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('ga-carousel-dot');
    dot.dataset.dotIndex = i;
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dotsWrap.append(dot);
  });

  // counter
  const counter = document.createElement('span');
  counter.classList.add('ga-carousel-counter');
  counter.textContent = `1 / ${rows.length}`;

  // rebuild carousel
  carouselBlock.innerHTML = '';
  carouselBlock.append(slideList, prevBtn, nextBtn, dotsWrap, counter);

  // state
  let current = 0;
  let timer = null;

  function goTo(index) {
    const allSlides = [...slideList.querySelectorAll('.ga-slide')];
    const allDots = [...dotsWrap.querySelectorAll('.ga-carousel-dot')];
    allSlides[current].classList.remove('active');
    allDots[current].classList.remove('active');
    current = (index + allSlides.length) % allSlides.length;
    allSlides[current].classList.add('active');
    allDots[current].classList.add('active');
    counter.textContent = `${current + 1} / ${allSlides.length}`;
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  dotsWrap.querySelectorAll('.ga-carousel-dot').forEach((dot) => {
    dot.addEventListener('click', () => goTo(+dot.dataset.dotIndex));
  });
  carouselBlock.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  function startAutoplay() { timer = setInterval(() => goTo(current + 1), interval); }
  function stopAutoplay() { clearInterval(timer); }
  if (autoplay) startAutoplay();
  carouselBlock.addEventListener('mouseenter', stopAutoplay);
  carouselBlock.addEventListener('mouseleave', () => { if (autoplay) startAutoplay(); });
}

/* =============================================
   ACCORDION
   ============================================= */

function buildAccordionItem(itemBlock, index) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('ga-item');

  // summary text: .gallery-accordion-item > div(row) > div(col) > text
  const firstCol = itemBlock.querySelector(':scope > div > div');
  const titleText = firstCol ? firstCol.textContent.trim() : `Section ${index + 1}`;

  // header
  const header = document.createElement('button');
  header.classList.add('ga-item-header');
  header.id = `ga-header-${index}`;
  header.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
  header.setAttribute('aria-controls', `ga-panel-${index}`);

  const titleSpan = document.createElement('span');
  titleSpan.classList.add('ga-item-title');
  titleSpan.textContent = titleText;

  const chevron = document.createElement('span');
  chevron.classList.add('ga-item-chevron');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = '&#8964;';

  header.append(titleSpan, chevron);

  // panel
  const panel = document.createElement('div');
  panel.classList.add('ga-item-panel');
  panel.id = `ga-panel-${index}`;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', `ga-header-${index}`);
  if (index === 0) panel.classList.add('open');

  // init carousel inside item
  const carousel = itemBlock.querySelector(':scope > .gallery-accordion-carousel');
  if (carousel) {
    initCarousel(carousel);
    panel.append(carousel);
  }

  // toggle
  header.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    const accordion = wrapper.closest('.gallery-accordion');

    accordion.querySelectorAll('.ga-item-panel').forEach((p) => p.classList.remove('open'));
    accordion.querySelectorAll('.ga-item-header').forEach((h) => h.setAttribute('aria-expanded', 'false'));

    if (!isOpen) {
      panel.classList.add('open');
      header.setAttribute('aria-expanded', 'true');
    }
  });

  wrapper.append(header, panel);
  return wrapper;
}

/* =============================================
   MAIN DECORATE
   ============================================= */

export default function decorate(block) {
  const items = [...block.querySelectorAll(':scope > .gallery-accordion-item')];
  if (!items.length) return;

  block.innerHTML = '';
  items.forEach((item, index) => {
    block.append(buildAccordionItem(item, index));
  });
}

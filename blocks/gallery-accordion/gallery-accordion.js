function buildSlide(slideBlock, index) {
  const slide = document.createElement('li');
  slide.classList.add('gallery-accordion-slide');
  slide.dataset.index = index;
  if (index === 0) slide.classList.add('active');

  // nested slide image
  const imgBlock = slideBlock.querySelector('.gallery-accordion-slide-image');
  if (imgBlock) {
    const picture = imgBlock.querySelector('picture');
    if (picture) {
      const imgWrap = document.createElement('div');
      imgWrap.classList.add('ga-slide-image');
      imgWrap.append(picture);
      slide.append(imgWrap);
    }
  }

  // nested slide content
  const contentBlock = slideBlock.querySelector('.gallery-accordion-slide-content');
  if (contentBlock) {
    const contentWrap = document.createElement('div');
    contentWrap.classList.add('ga-slide-content');
    const h2 = contentBlock.querySelector('h2');
    const p = contentBlock.querySelector('p');
    const a = contentBlock.querySelector('a');
    if (h2) contentWrap.append(h2);
    if (p) contentWrap.append(p);
    if (a) { a.classList.add('ga-slide-cta'); contentWrap.append(a); }
    slide.append(contentWrap);
  }

  return slide;
}

function initGalleryCarousel(carouselBlock) {
  const autoplay = carouselBlock.dataset.autoplay === 'true';
  const interval = parseInt(carouselBlock.dataset.interval || '5000', 10);
  const slides = [...carouselBlock.querySelectorAll(':scope > .gallery-accordion-slide')];

  if (!slides.length) return;

  // build slide list
  const slideList = document.createElement('ul');
  slideList.classList.add('ga-carousel-slides');
  slides.forEach((slide, i) => slideList.append(buildSlide(slide, i)));

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
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('ga-carousel-dot');
    dot.dataset.dotIndex = i;
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dotsWrap.append(dot);
  });

  // slide counter
  const counter = document.createElement('span');
  counter.classList.add('ga-carousel-counter');
  counter.textContent = `1 / ${slides.length}`;

  // rebuild carousel
  carouselBlock.innerHTML = '';
  carouselBlock.append(slideList, prevBtn, nextBtn, dotsWrap, counter);

  // state
  let current = 0;
  let timer = null;

  function goTo(index) {
    const allSlides = [...slideList.querySelectorAll('.gallery-accordion-slide')];
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

  // autoplay
  function startAutoplay() { timer = setInterval(() => goTo(current + 1), interval); }
  function stopAutoplay() { clearInterval(timer); }
  if (autoplay) startAutoplay();
  carouselBlock.addEventListener('mouseenter', stopAutoplay);
  carouselBlock.addEventListener('mouseleave', () => { if (autoplay) startAutoplay(); });
}

/* =============================================
   ACCORDION HELPERS
   ============================================= */

function buildAccordionItem(itemBlock, index) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('ga-item');

  // header button
  const header = document.createElement('button');
  header.classList.add('ga-item-header');
  header.id = `ga-header-${index}`;
  header.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
  header.setAttribute('aria-controls', `ga-panel-${index}`);

  // get title text from summary field
  const summaryEl = itemBlock.querySelector('h2, h3, p, .gallery-accordion-item-summary');
  const titleText = summaryEl ? summaryEl.textContent.trim() : `Section ${index + 1}`;

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

  // find nested carousel and init it
  const carousel = itemBlock.querySelector(':scope > .gallery-accordion-carousel');
  if (carousel) {
    initGalleryCarousel(carousel);
    panel.append(carousel);
  }

  // toggle
  header.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    const accordion = wrapper.closest('.gallery-accordion');

    // close all
    accordion.querySelectorAll('.ga-item-panel').forEach((p) => p.classList.remove('open'));
    accordion.querySelectorAll('.ga-item-header').forEach((h) => h.setAttribute('aria-expanded', 'false'));

    // open current if was closed
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

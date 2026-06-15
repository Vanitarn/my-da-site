import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function buildPicture(src, alt, eager, className) {
  if (!src) return null;
  if (src.endsWith('.svg')) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = className;
    return img;
  }
  const picture = createOptimizedPicture(src, alt || '', eager, [
    { media: '(min-width: 768px)', width: '1200' },
    { width: '750' },
  ]);
  picture.className = className;
  return picture;
}

export default function decorate(block) {
  // Row structure (matches EDS original — one field per row):
  // Row 1: Desktop Image
  // Row 2: Mobile Image
  // Row 3: Label + Description (first child = label, rest = description)
  // Row 4: squareEdges (true/false)
  // Row 5: fullWidth  (true/false)
  const [
    imageRow,
    mobileImageRow,
    descriptionRow,
    squareEdgesRow,
    fullWidthRow,
  ] = [...block.children];

  // ── Read image values ──────────────────────────────────
  const desktopImg = imageRow?.querySelector('picture > img, img');
  const mobileImgEl = mobileImageRow?.querySelector('picture > img, img');

  const image = desktopImg?.src || '';
  const imageAlt = desktopImg?.alt || '';
  const mobileImage = mobileImgEl?.src || image;
  const mobileImageAlt = mobileImgEl?.alt || imageAlt;

  // ── Read description row ───────────────────────────────
  // descriptionRow > first cell > [labelEl, ...descEls]
  const descChildren = [...(descriptionRow?.firstElementChild?.children || [])];
  const [labelEl, ...descEls] = descChildren;
  const labelText = labelEl?.textContent?.trim() || '';

  const descDiv = document.createElement('div');
  descEls.forEach((el) => {
    if (el.innerHTML?.trim()) descDiv.appendChild(el.cloneNode(true));
  });

  // ── Read flags ─────────────────────────────────────────
  const squareEdges = squareEdgesRow?.textContent?.trim() || 'false';
  const fullWidth = fullWidthRow?.textContent?.trim() || 'false';

  // ── Build container ────────────────────────────────────
  const container = document.createElement('div');
  container.className = 'image-block-container col-12';

  // ── Image area ─────────────────────────────────────────
  const imageArea = document.createElement('div');
  imageArea.className = squareEdges === 'true' ? 'image-area' : 'image-area rounded-edges';

  if (image) {
    const desktopPic = buildPicture(image, imageAlt, true, 'desktop-image-only');
    if (desktopPic) imageArea.append(desktopPic);
  }

  if (mobileImage) {
    const mobilePic = buildPicture(mobileImage, mobileImageAlt, false, 'mobile-image-only');
    if (mobilePic) imageArea.append(mobilePic);
  }

  container.append(imageArea);

  // ── Label + description ────────────────────────────────
  if (labelText || descDiv.children.length) {
    const labelDescContainer = document.createElement('div');
    labelDescContainer.className = 'image-label-desc-container';

    let labelDivEl;
    let descDivEl;

    if (labelText) {
      labelDivEl = document.createElement('div');
      labelDivEl.className = 'image-label';
      labelDivEl.textContent = labelText;
      labelDivEl.setAttribute('tabindex', '0');
      labelDivEl.setAttribute('role', 'button');
      labelDivEl.setAttribute('aria-expanded', 'false');
      labelDivEl.setAttribute('data-track-event', 'Accordion Open');
      labelDivEl.setAttribute('data-track-component', 'Image Block');
      labelDivEl.setAttribute('data-track-label', 'image-accordion');
      labelDivEl.setAttribute('data-track-location', 'Image Block');
      labelDivEl.style.cursor = 'pointer';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon icon-image-label-icon image-label-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      labelDivEl.append(iconSpan);
      labelDescContainer.append(labelDivEl);
    }

    if (descDiv.children.length) {
      descDivEl = document.createElement('div');
      descDivEl.className = 'image-description';
      descDivEl.style.display = 'none';
      descDivEl.append(...[...descDiv.children].map((c) => c.cloneNode(true)));
      labelDescContainer.append(descDivEl);
    }

    // ── Toggle click + keyboard ──────────────────────────
    if (labelDivEl && descDivEl) {
      const toggle = () => {
        const isVisible = descDivEl.style.display !== 'none';
        descDivEl.style.display = isVisible ? 'none' : '';
        labelDivEl.setAttribute('aria-expanded', String(!isVisible));
        labelDivEl.querySelector('.image-label-icon')?.classList.toggle('rotated', !isVisible);
        labelDivEl.setAttribute('data-track-event', isVisible ? 'Accordion Open' : 'Accordion Close');
      };

      labelDivEl.addEventListener('click', toggle);
      labelDivEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    }

    container.append(labelDescContainer);
  }

  // ── Rebuild block ──────────────────────────────────────
  moveInstrumentation(block, container);
  block.replaceChildren(container);

  // ── Block-level modifier classes ──────────────────────
  if (fullWidth === 'true') block.classList.add('image-full-width');
  if (squareEdges === 'true') block.classList.add('enable-square-edges');
}

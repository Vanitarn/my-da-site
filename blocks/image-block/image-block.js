/**
 * Image Block — DA Compatible
 *
 * DA Table Structure:
 * ┌──────────────────────────────────────────────────────┐
 * │  image-block                                         │
 * ├──────────────────┬──────────────────┬────────────────┤
 * │ [desktop image]  │ [mobile image]   │ label + desc   │ ← Row 1
 * ├──────────────────┼──────────────────┼──────────────  ┤
 * │ squareEdges      │ fullWidth        │                │ ← Row 2
 * └──────────────────┴──────────────────┴────────────────┘
 *
 * EDS converts this table to:
 * block
 *   ├── div (row 1)
 *   │     ├── div (col 1) → desktop image
 *   │     ├── div (col 2) → mobile image
 *   │     └── div (col 3) → label + description
 *   └── div (row 2)
 *         ├── div (col 1) → squareEdges
 *         └── div (col 2) → fullWidth
 *
 * But your JS expects 5 FLAT children:
 *   imageElement, mobileImageElement, descriptionElement,
 *   squareEdgesElement, fullWidthElement
 *
 * So we restructure the DOM before passing to your original logic.
 */

export default async function decorate(block) {
  try {
    // ── Read DA table rows ──────────────────────────────
    const rows = [...block.querySelectorAll(':scope > div')];
    const row1 = rows[0];
    const row2 = rows[1];

    // Row 1 columns
    const row1Cols = row1 ? [...row1.children] : [];
    const desktopImageCol = row1Cols[0]; // col 1 — desktop image
    const mobileImageCol  = row1Cols[1]; // col 2 — mobile image
    const descCol         = row1Cols[2]; // col 3 — label + description + fontSize

    // Row 2 columns
    const row2Cols = row2 ? [...row2.children] : [];
    const squareEdgesCol = row2Cols[0]; // col 1 — squareEdges
    const fullWidthCol   = row2Cols[1]; // col 2 — fullWidth

    // ── Read values ─────────────────────────────────────
    const desktopImg  = desktopImageCol?.querySelector('picture > img');
    const mobileImg   = mobileImageCol?.querySelector('picture > img');

    const image       = desktopImg?.src    || '';
    const imageAlt    = desktopImg?.alt    || '';
    const mobileImage = mobileImg?.src     || '';
    const mobileImageAlt = mobileImg?.alt  || '';

    // label = first text element in descCol
    const labelEl = descCol?.querySelector('p, h1, h2, h3, h4, h5, h6');
    const labelText = labelEl?.textContent?.trim() || '';

    // description = remaining content after label
    const descDiv = document.createElement('div');
    if (descCol) {
      [...descCol.children].forEach((child) => {
        if (child !== labelEl) {
          descDiv.appendChild(child.cloneNode(true));
        }
      });
    }

    // squareEdges and fullWidth values
    const squareEdges = squareEdgesCol?.textContent?.trim() || 'false';
    const fullWidth   = fullWidthCol?.textContent?.trim()   || 'false';

    // ── Build optimized picture elements ────────────────
    function buildPicture(src, alt) {
      if (!src) return null;
      const picture = document.createElement('picture');
      const sourceWebp = document.createElement('source');
      sourceWebp.type = 'image/webp';
      sourceWebp.srcset = src;
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      img.loading = 'lazy';
      picture.append(sourceWebp, img);
      return picture;
    }

    // ── Build block HTML ────────────────────────────────
    const imageArea = document.createElement('div');
    imageArea.classList.add('image-area');

    // desktop picture
    const desktopPicture = buildPicture(image, imageAlt);
    if (desktopPicture) {
      desktopPicture.classList.add('desktop-image');
      imageArea.append(desktopPicture);
    }

    // mobile picture
    const mobilePicture = buildPicture(mobileImage || image, mobileImageAlt || imageAlt);
    if (mobilePicture) {
      mobilePicture.classList.add('mobile-image');
      imageArea.append(mobilePicture);
    }

    // content area
    const contentArea = document.createElement('div');
    contentArea.classList.add('content-area');

    if (labelText) {
      const label = document.createElement('p');
      label.classList.add('image-label');
      label.textContent = labelText;
      contentArea.append(label);
    }

    if (descDiv.innerHTML.trim()) {
      const desc = document.createElement('div');
      desc.classList.add('image-description');
      desc.innerHTML = descDiv.innerHTML;
      contentArea.append(desc);
    }

    // ── Rebuild block ───────────────────────────────────
    block.innerHTML = '';
    block.append(imageArea);
    if (contentArea.children.length) block.append(contentArea);

    // ── Apply classes ───────────────────────────────────
    if (fullWidth === 'true') {
      block.classList.add('image-full-width');
    }

    if (squareEdges === 'true') {
      block.classList.add('enable-square-edges');
    }

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading image-block:', error);
  }
}
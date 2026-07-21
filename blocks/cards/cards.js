/*
import { patternDecorate } from '../../scripts/blockTemplate.js';

export default async function decorate(block) {
  patternDecorate(block);
}
*/

import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { applyFocalPoint } from '../../scripts/utils.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');

    // Column structure (must be authored in this order):
    // 1: Image | 2: Body | 3: Eyebrow | 4: Card style | 5: CTA style
    // If column 3 (eyebrow) is omitted, columns 4 and 5 will be misread and the card will break.

    // Read eyebrow from column 3 (index 2)
    const eyebrowText = row.children[2]?.querySelector('p')?.textContent?.trim() || '';

    // Read card style from column 4 (index 3)
    const cardStyle = row.children[3]?.querySelector('p')?.textContent?.trim() || 'default';
    if (cardStyle && cardStyle !== 'default') {
      li.className = cardStyle;
    }

    // Read CTA style from column 5 (index 4)
    const ctaStyle = row.children[4]?.querySelector('p')?.textContent?.trim() || 'default';

    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    // Process the li children to identify and style them correctly
    [...li.children].forEach((div, index) => {
      if (index === 0) {
        div.className = 'cards-card-image';
      } else if (index === 1) {
        div.className = 'cards-card-body';
      } else if (index === 2) {
        // Eyebrow source div — hide it (value already read above)
        div.className = 'cards-config';
        div.style.display = 'none';
      } else if (index === 3 || index === 4) {
        div.className = 'cards-config';
        const p = div.querySelector('p');
        if (p) p.style.display = 'none';
      } else {
        div.className = 'cards-card-body';
      }
    });

    // Inject eyebrow element into card body if authored
    if (eyebrowText) {
      const cardBody = li.querySelector('.cards-card-body');
      if (cardBody) {
        const eyebrow = document.createElement('p');
        eyebrow.className = 'cards-card-eyebrow';
        eyebrow.textContent = eyebrowText;
        cardBody.insertBefore(eyebrow, cardBody.firstChild);
      }
    }

    // Apply CTA styles to button containers
    const buttonContainers = li.querySelectorAll('p.button-container');
    buttonContainers.forEach((buttonContainer) => {
      buttonContainer.classList.remove('default', 'cta-button', 'cta-button-secondary', 'cta-button-dark', 'cta-default');
      buttonContainer.classList.add(ctaStyle);
    });

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    applyFocalPoint(img, 'li'); // set --focal on li before img is replaced
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);
}

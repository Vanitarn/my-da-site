function applyFocalPoint(img) {
  // Editor DOM exposes data-focal-x/y; published page only has title="data-focal:x,y"
  let x = img.dataset.focalX;
  let y = img.dataset.focalY;
  if (!x || !y) {
    const t = img.getAttribute('title');
    if (t?.includes('data-focal:')) {
      [x, y] = t.split('data-focal:')[1].split(',');
    }
  }
  if (!x || !y) return;
  img.closest('.hero').style.setProperty('--focal', `${x.trim()}% ${y.trim()}%`);
  if (img.getAttribute('title')?.includes('data-focal:')) img.removeAttribute('title');
}

function setBackgroundFocus(img) {
  applyFocalPoint(img);
  const observer = new MutationObserver(() => applyFocalPoint(img));
  observer.observe(img, { attributes: true, attributeFilter: ['data-focal-x', 'data-focal-y', 'title'] });
}

function decorateBackground(bg) {
  const bgPic = bg.querySelector('picture');
  if (!bgPic) return;

  const img = bgPic.querySelector('img');
  setBackgroundFocus(img);

  const vidLink = bgPic.closest('a[href*=".mp4"]');
  if (!vidLink) return;
  const video = document.createElement('video');
  video.src = vidLink.href;
  video.loop = true;
  video.muted = true;
  video.inert = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('preload', 'none');
  video.load();
  video.addEventListener('canplay', () => {
    video.play();
    bgPic.remove();
  });
  vidLink.parentElement.append(video, bgPic);
  vidLink.remove();
}

function decorateForeground(fg) {
  [...fg.children].forEach((child, idx) => {
    const heading = child.querySelector('h1, h2, h3, h4, h5, h6');
    const text = heading || child.querySelector('p, a, ul');
    if (heading) {
      heading.classList.add('hero-heading');
      const detail = heading.previousElementSibling;
      if (detail) {
        detail.classList.add('hero-detail');
      }
    }
    // Determine foreground column types
    if (text) {
      child.classList.add('fg-text');
      if (idx === 0) {
        child.closest('.hero').classList.add('hero-text-start');
      } else {
        child.closest('.hero').classList.add('hero-text-end');
      }
    }
  });
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const fg = rows.pop();
  fg.classList.add('hero-foreground');
  decorateForeground(fg);
  if (rows.length) {
    const bg = rows.pop();
    bg.classList.add('hero-background');
    decorateBackground(bg);
  }
}

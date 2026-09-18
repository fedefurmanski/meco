// Hero F: split the title and lead into lines so each one can slide in (re-split without animation on resize)
(() => {
  const hero = document.querySelector('.hero-f');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = [hero.querySelector('.hero-f__title'), hero.querySelector('.hero-f__lead')];
  const originals = targets.map(el => [...el.childNodes]);

  const split = (el, nodes, startIndex) => {
    el.textContent = '';
    const units = [];
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          const unit = /^\s+$/.test(part) ? document.createTextNode(' ') : Object.assign(document.createElement('span'), { textContent: part });
          el.appendChild(unit); units.push(unit);
        }
      } else {
        el.appendChild(node); units.push(node); // keeps the sr-only text and the live word rotator intact
      }
    }
    const lines = [];
    let lastTop = null;
    for (const unit of units) {
      // a <br> in the markup forces a line break (and is dropped from the output)
      if (unit.nodeName === 'BR') { if (unit.getClientRects().length || unit.previousSibling) lastTop = null; continue; }
      if (unit.nodeType === Node.TEXT_NODE || unit.classList?.contains('sr-only')) { (lines.at(-1) || lines[lines.push([]) - 1]).push(unit); continue; }
      const top = Math.round(unit.getBoundingClientRect().top);
      if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
      lines.at(-1).push(unit);
    }
    el.textContent = '';
    lines.forEach((line, i) => {
      const outer = document.createElement('span'); outer.className = 'line';
      const inner = document.createElement('span'); inner.className = 'line__inner';
      inner.style.setProperty('--i', startIndex + i);
      line.forEach(u => inner.appendChild(u));
      outer.appendChild(inner); el.appendChild(outer);
    });
    return lines.length;
  };

  const run = () => {
    let i = 0;
    targets.forEach((el, k) => { i += split(el, originals[k], i); });
    hero.style.setProperty('--lines', i);
    document.documentElement.classList.remove('split-pending');
  };
  document.fonts.ready.then(run);

  let t;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { hero.classList.add('is-static'); run(); }, 150);
  });
})();

// Hero F: cycles the last word of the title ("durable" → vert → vivant …). The h1 keeps "durable" for assistive tech.
(() => {
  const title = document.querySelector('[data-rotator]');
  if (!title || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = [...title.querySelectorAll('.hero-f__word')];
  let i = 0, paused = false;
  const next = () => {
    if (paused || document.hidden) return;
    const current = words[i];
    i = (i + 1) % words.length;
    current.classList.remove('is-active');
    current.classList.add('is-leaving');
    words[i].classList.add('is-active');
    setTimeout(() => current.classList.remove('is-leaving'), 650);
  };
  setInterval(next, 1800);
  title.addEventListener('mouseenter', () => { paused = true; });
  title.addEventListener('mouseleave', () => { paused = false; });
})();

// Hero F: gentle scroll parallax on the tree
(() => {
  const wrap = document.querySelector('[data-parallax]');
  if (!wrap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; wrap.style.setProperty('--sy', Math.min(scrollY, 900) * .18); });
  }, { passive: true });
})();

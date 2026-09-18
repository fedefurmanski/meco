// Smooth scrolling (Lenis). Skipped for reduced motion; touch devices keep native scrolling.
const lenis = (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches)
  ? new Lenis({ lerp: .085, wheelMultiplier: .9, anchors: false })
  : null;
if (lenis) {
  const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
// Scroll-driven effects run in the same frame Lenis moves the page (a separate rAF would lag one frame and make them jitter)
const onScroll = fn => {
  if (lenis) { lenis.on('scroll', fn); return; }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; fn(); }); } }, { passive: true });
};
// In-page links glide to their target, leaving room for the sticky header
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || link.getAttribute('href').length < 2) return;
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(target, { offset: -110, duration: 1.2 });
  else target.scrollIntoView();
});

// Dropdowns: open on hover (pointer) or click, one at a time, close on outside click / Esc
const dropdowns = [...document.querySelectorAll('[data-dd]')];

function setOpen(dd, open) {
  dd.classList.toggle('is-open', open);
  dd.querySelector('.nav__btn').setAttribute('aria-expanded', String(open));
}
const closeAll = except => dropdowns.forEach(dd => { if (dd !== except) setOpen(dd, false); });

const hoverable = matchMedia('(hover: hover)').matches;
let closeTimer;
dropdowns.forEach((dd) => {
  const btn = dd.querySelector('.nav__btn');
  btn.addEventListener('click', () => {
    const willOpen = !dd.classList.contains('is-open');
    closeAll(dd);
    setOpen(dd, willOpen);
  });
  dd.querySelectorAll('.dd__box a').forEach((a) => a.addEventListener('click', () => setOpen(dd, false)));
  if (!hoverable) return;
  // hover with a small grace period, so moving between the button and the panel does not close it
  const open = () => { clearTimeout(closeTimer); closeAll(dd); setOpen(dd, true); };
  const close = () => { closeTimer = setTimeout(() => setOpen(dd, false), 140); };
  btn.addEventListener('mouseenter', open);
  btn.addEventListener('focus', open);
  dd.querySelector('.dd__panel').addEventListener('mouseenter', () => clearTimeout(closeTimer));
  dd.addEventListener('mouseleave', close);
});
document.querySelector('.header').addEventListener('mouseleave', () => { if (hoverable) closeAll(null); });

document.addEventListener('mousedown', (e) => {
  dropdowns.forEach((dd) => { if (!dd.contains(e.target) && !dd.querySelector('.dd__panel').contains(e.target)) setOpen(dd, false); });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll(null);
});

// Mobile menu
const burger = document.querySelector('.burger');
const mobileMenu = document.getElementById('mobile-menu');
burger.addEventListener('click', () => {
  const open = mobileMenu.hidden;
  mobileMenu.hidden = !open;
  burger.setAttribute('aria-expanded', String(open));
});

// Campaign stack: title parallax, a slight tilt on incoming cards, and as the next card slides over a stuck card, shrink and dim the one underneath (--shrink 0→1)
(() => {
  const stack = document.querySelector('[data-stack]');
  if (!stack || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = [...stack.children];
  const medias = cards.map(c => c.querySelector('.stack-card__media'));
  const band = stack.closest('.band');
  const head = band && band.querySelector('.band__head');
  let stickyTops = [];
  const measure = () => { stickyTops = cards.map(c => parseFloat(getComputedStyle(c).top)); };
  measure();
  let ticking = false;
  const update = () => {
    ticking = false;
    if (head) {
      // Parallax: once the section is in view the title moves at ~30% of the scroll speed, so the first card overtakes it.
      // It never rises above the stuck cards (it waits hidden behind them), and once the pile starts leaving it is frozen
      // so it leaves together with the stack and never peeks out.
      const n = cards.length;
      const stickyFirst = stickyTops[0];
      const stickyLast = stickyTops[n - 1];
      // px scrolled since the whole pile started to leave (the stack's content end passed the last stuck card)
      const excess = Math.max(0, stickyLast + cards[n - 1].offsetHeight - stack.getBoundingClientRect().bottom);
      const naturalTop = head.getBoundingClientRect().top - (parseFloat(head.style.getPropertyValue('--drift')) || 0) + excess;
      const scrolled = Math.max(0, innerHeight * .55 - band.getBoundingClientRect().top - excess);
      const minTop = stickyFirst + 60;
      const ease = 220; // ramp the slowdown in gradually instead of switching speed at once
      const drift = Math.max(.7 * (scrolled - ease * (1 - Math.exp(-scrolled / ease))), minTop - naturalTop, 0);
      head.style.setProperty('--drift', drift.toFixed(1));
    }
    cards.forEach((card, i) => {
      // incoming card is slightly tilted and straightens as it reaches its sticky position
      const dist = card.getBoundingClientRect().top - stickyTops[i];
      const t = Math.min(1, Math.max(0, dist / (innerHeight * .75)));
      card.style.setProperty('--tilt', (Math.pow(t, 1.3) * 4).toFixed(3));
      // photo zoom-out: zoomed in while the card is low in the viewport, natural size a bit before it sticks
      const r = Math.min(1, Math.max(0, 1 - (dist - innerHeight * .08) / (innerHeight * .55)));
      medias[i].style.setProperty('--reveal', (1 - Math.pow(1 - r, 3)).toFixed(3));
      const next = cards[i + 1];
      if (!next) return;
      const top = stickyTops[i];
      const covered = (card.offsetHeight - (next.getBoundingClientRect().top - top)) / card.offsetHeight;
      card.style.setProperty('--shrink', Math.min(1, Math.max(0, covered)).toFixed(3));
    });
  };
  onScroll(update);
  addEventListener('resize', () => { measure(); update(); });
  update();
})();

// Showcase: the photo opens from a small frame to the full card while its sticky frame is pinned, then the content comes in
(() => {
  const section = document.querySelector('[data-showcase]');
  if (!section || !document.documentElement.classList.contains('motion')) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const top = section.getBoundingClientRect().top;
    const pinned = section.offsetHeight - (innerHeight - 92); // px the sticky frame stays pinned
    const start = innerHeight * .55;                        // begins opening as it comes up the page
    const end = 92 - pinned * .5;                           // fully open halfway through the pinned stretch
    const t = Math.min(1, Math.max(0, (start - top) / (start - end)));
    const p = t * t * (3 - 2 * t);
    section.style.setProperty('--p', p.toFixed(4));
    if (p > .94) section.classList.add('is-open');
    else if (p < .6) section.classList.remove('is-open');
  };
  onScroll(update);
  addEventListener('resize', update);
  update();
})();

// Médias rail: arrow buttons, mouse drag, and a progress bar that tracks the scroll position
(() => {
  const rail = document.querySelector('[data-rail]');
  if (!rail) return;
  const track = rail.querySelector('.media-rail__track');
  const bar = rail.querySelector('.media-rail__progress span');
  const buttons = [...document.querySelectorAll('.media-nav')];
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const ratio = track.clientWidth / track.scrollWidth;
    const p = max > 0 ? track.scrollLeft / max : 0;
    bar.style.setProperty('--w', `${ratio * 100}%`);
    bar.style.setProperty('--x', `${p * (1 / ratio - 1) * 100}%`);
    buttons[0].disabled = track.scrollLeft < 4;
    buttons[1].disabled = track.scrollLeft > max - 4;
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const step = track.querySelector('li').offsetWidth + 20;
    track.scrollBy({ left: step * Number(btn.dataset.dir), behavior: 'smooth' });
  }));
  // drag with the mouse (touch keeps native swipe)
  let startX = 0, startLeft = 0, moved = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    startX = e.clientX; startLeft = track.scrollLeft; moved = false;
    const move = ev => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging'); }
      track.scrollLeft = startLeft - dx;
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      if (moved) {
        track.classList.remove('is-dragging');
        const step = track.querySelector('li').offsetWidth + 20;
        track.scrollTo({ left: Math.round(track.scrollLeft / step) * step, behavior: 'smooth' });
      }
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  track.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

// Footer uncover: 0 when the footer starts to show, 1 once it is fully uncovered
(() => {
  const footer = document.querySelector('[data-footer]');
  if (!footer || !document.documentElement.classList.contains('motion')) return;
  const main = document.querySelector('main');
  let ticking = false;
  const update = () => {
    ticking = false;
    const h = footer.offsetHeight;
    const uncovered = innerHeight - main.getBoundingClientRect().bottom; // px of footer showing below the sheet
    footer.style.setProperty('--reveal', Math.min(1, Math.max(0, uncovered / h)).toFixed(3));
  };
  onScroll(update);
  addEventListener('resize', update);
  update();
})();

// Reveal titles marked [data-reveal] once they enter the viewport
(() => {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: .2, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
})();

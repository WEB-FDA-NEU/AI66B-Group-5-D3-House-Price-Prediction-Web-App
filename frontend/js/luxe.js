// UI-1: motion layer for the "Atelier" Home page. Pure enhancement:
// every section is visible and usable without this file.
//  - hero photographs follow the existing slider (home.js owns the copy),
//  - autoplay with a pause button, stopped on hover/focus and when hidden,
//  - scroll reveal, and a drag/arrow-key horizontal gallery.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const INTERVAL = 7000;

const CAPTIONS = [
  ['Không gian 01 · ảnh minh họa', 'Biệt thự trên đồi, ánh chiều'],
  ['Không gian 02 · ảnh minh họa', 'Phòng khách hướng vườn'],
  ['Không gian 03 · ảnh minh họa', 'Góc ăn gỗ sồi, ghế nhung'],
];

function initHero() {
  const hero = document.querySelector('.lux-hero');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('.lux-slide')];
  const tabs = [...hero.querySelectorAll('[data-hero-slide]')];
  const caption = hero.querySelector('.lux-caption');
  const next = document.getElementById('hero-next');
  const pause = document.getElementById('hero-pause');
  hero.style.setProperty('--lux-interval', `${INTERVAL / 1000}s`);

  // Mirror whichever slide home.js marks as pressed (click, arrows, swipe, keys).
  function sync() {
    const index = Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-pressed') === 'true'));
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    const img = slides[index]?.querySelector('img');
    if (img?.loading === 'lazy') img.loading = 'eager';
    if (caption && CAPTIONS[index]) caption.replaceChildren(
      Object.assign(document.createElement('small'), { textContent: CAPTIONS[index][0] }),
      Object.assign(document.createElement('strong'), { textContent: CAPTIONS[index][1] }));
    restartProgress();
  }
  new MutationObserver(sync).observe(hero, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });

  // Autoplay: a deliberate, slow cross-fade. Never with reduced motion.
  let timer = null;
  let userPaused = reduced.matches;
  let hovering = false;
  const playing = () => !userPaused && !hovering && !document.hidden;
  function schedule() {
    clearTimeout(timer);
    hero.classList.toggle('is-paused', !playing());
    if (playing()) timer = setTimeout(() => next?.click(), INTERVAL);
  }
  function restartProgress() {
    // Restart the thin progress line under the active tab with the timer.
    const active = tabs.find(tab => tab.getAttribute('aria-pressed') === 'true');
    active?.classList.remove('lux-restart'); void active?.offsetWidth;
    schedule();
  }
  function renderPause() {
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', userPaused ? 'Tiếp tục trình chiếu' : 'Tạm dừng trình chiếu');
    pause.textContent = userPaused ? '▶' : '❚❚';
  }
  pause?.addEventListener('click', () => { userPaused = !userPaused; renderPause(); schedule(); });
  hero.addEventListener('pointerenter', () => { hovering = true; schedule(); });
  hero.addEventListener('pointerleave', () => { hovering = false; schedule(); });
  hero.addEventListener('focusin', () => { hovering = true; schedule(); });
  hero.addEventListener('focusout', () => { hovering = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener?.('change', () => { if (reduced.matches) { userPaused = true; renderPause(); schedule(); } });
  if (pause) renderPause();
  sync();
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length || reduced.matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js-reveal');
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  items.forEach(item => {
    // Anything already on screen is shown at once: no blank first frame.
    if (item.getBoundingClientRect().top < innerHeight) item.classList.add('is-visible');
    else io.observe(item);
  });
}

function initGallery() {
  const track = document.getElementById('lux-gallery');
  if (!track) return;
  const step = () => (track.querySelector('figure')?.getBoundingClientRect().width ?? 400) + 22;
  const go = dir => track.scrollBy({ left: dir * step(), behavior: reduced.matches ? 'auto' : 'smooth' });
  document.getElementById('gallery-prev')?.addEventListener('click', () => go(-1));
  document.getElementById('gallery-next')?.addEventListener('click', () => go(1));
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(event.key === 'ArrowRight' ? 1 : -1); }
  });
  // Mouse drag (touch already scrolls natively).
  let start = null;
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    start = { x: event.clientX, left: track.scrollLeft, moved: false };
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener('pointermove', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 4) { start.moved = true; track.classList.add('is-dragging'); }
    track.scrollLeft = start.left - dx;
  });
  const end = () => {
    if (!start) return;
    const moved = start.moved; start = null;
    track.classList.remove('is-dragging');
    if (moved) { const s = step(); track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: reduced.matches ? 'auto' : 'smooth' }); }
  };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
}

initHero();
initReveal();
initGallery();

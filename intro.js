const dialog = document.getElementById('site-intro');
const artwork = dialog.querySelector('.entry-film-art');
const replay = document.getElementById('intro-replay');
const status = document.getElementById('intro-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sessionKey = 'zhi.opening-film.seen.v2';
const duration = 4950;
let run;

function seenOpening() {
  try {
    return sessionStorage.getItem(sessionKey) === '1';
  } catch {
    return false;
  }
}

function closeOpening(animate = true) {
  if (!run || run.closing) return;
  const active = run;
  active.closing = true;
  active.events.abort();
  clearTimeout(active.deadline);

  function cleanup() {
    dialog.removeEventListener('animationend', onExit);
    dialog.close();
    dialog.classList.remove('is-leaving');
    artwork.removeAttribute('src');
    if (active.url) URL.revokeObjectURL(active.url);
    run = undefined;
  }
  function onExit(event) {
    if (event.target !== dialog || event.animationName !== 'entry-film-out') return;
    clearTimeout(active.deadline);
    cleanup();
  }
  if (!dialog.open || !animate || reducedMotion.matches) {
    cleanup();
    return;
  }
  dialog.addEventListener('animationend', onExit);
  dialog.classList.add('is-leaving');
  active.deadline = setTimeout(cleanup, 620);
}

async function playOpening(manual = false) {
  if (run) return;
  const active = { events: new AbortController(), closing: false, deadline: undefined, url: undefined };
  const { signal } = active.events;
  run = active;
  status.textContent = '';

  function unavailable() {
    if (manual) status.textContent = 'تعذّر تشغيل افتتاحية زهي.';
    closeOpening(false);
  }
  if (!manual) {
    const cancelPending = () => { if (!dialog.open) closeOpening(false); };
    for (const event of ['pointerdown', 'keydown', 'scroll']) {
      window.addEventListener(event, cancelPending, { capture: true, passive: true, signal });
    }
  }
  active.deadline = setTimeout(unavailable, manual ? 6500 : 2500);
  const file = matchMedia('(max-aspect-ratio: 4/5)').matches ? 'opening-car-portrait.webp' : 'opening-car.webp';
  try {
    const response = await fetch('assets/' + file, { signal });
    if (!response.ok) throw new Error('Opening media unavailable');
    const movie = await response.blob();
    if (signal.aborted) return;
    // A distinct object URL restarts the animation on replay without fetching a cache-busting URL.
    active.url = URL.createObjectURL(movie);
    artwork.src = active.url;
    await artwork.decode();
    if (signal.aborted) return;

    clearTimeout(active.deadline);
    dialog.style.setProperty('--opening-duration', duration + 'ms');
    dialog.showModal();
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Playback is still available. */ }
    active.deadline = setTimeout(() => closeOpening(), duration);
  } catch {
    if (!signal.aborted) unavailable();
  }
}

document.getElementById('intro-skip').addEventListener('click', () => closeOpening());
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeOpening();
});
replay.addEventListener('click', () => { void playOpening(true); });
reducedMotion.addEventListener('change', event => {
  if (event.matches) closeOpening(false);
});
if (!seenOpening() && !reducedMotion.matches && (!location.hash || location.hash === '#home')) {
  void playOpening();
}

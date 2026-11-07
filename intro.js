const dialog = document.getElementById('site-intro');
const video = dialog.querySelector('video');
const replay = document.getElementById('intro-replay');
const status = document.getElementById('intro-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sessionKey = 'zhi.opening-film.seen.v3';
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
  video.pause();

  const cleanup = () => {
    active.exit.abort();
    dialog.close();
    dialog.classList.remove('is-leaving');
    dialog.style.removeProperty('--played');
    video.removeAttribute('src');
    video.load();
    run = undefined;
  };
  if (!dialog.open || !animate || reducedMotion.matches) {
    cleanup();
    return;
  }
  dialog.classList.add('is-leaving');
  const timer = setTimeout(cleanup, 620);
  dialog.addEventListener('animationend', () => {
    clearTimeout(timer);
    cleanup();
  }, { once: true, signal: active.exit.signal });
}

function playOpening(manual = false) {
  if (run) return;
  const events = new AbortController();
  const active = { events, exit: new AbortController(), closing: false, deadline: undefined };
  const signal = events.signal;
  run = active;
  status.textContent = '';
  video.preload = 'auto';
  video.muted = true;
  video.defaultMuted = true;

  function unavailable() {
    if (manual) status.textContent = 'تعذّر تشغيل افتتاحية زهي.';
    closeOpening(false);
  }
  function start() {
    clearTimeout(active.deadline);
    dialog.showModal();
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* Playback is still available. */ }
    active.deadline = setTimeout(() => closeOpening(), 9500);
    video.play().catch(() => {
      if (!signal.aborted) unavailable();
    });
  }

  video.addEventListener('canplay', start, { once: true, signal });
  video.addEventListener('error', unavailable, { once: true, signal });
  video.addEventListener('ended', () => closeOpening(), { once: true, signal });
  video.addEventListener('timeupdate', () => {
    if (video.duration > 0) dialog.style.setProperty('--played', video.currentTime / video.duration);
  }, { signal });
  if (!manual) {
    const cancelPending = () => { if (!dialog.open) closeOpening(false); };
    for (const event of ['pointerdown', 'keydown', 'scroll']) {
      window.addEventListener(event, cancelPending, { capture:true, passive:true, signal });
    }
  }
  active.deadline = setTimeout(unavailable, manual ? 6000 : 2000);
  video.src = matchMedia('(max-aspect-ratio: 4/5)').matches ? 'assets/intro-carrera-portrait.mp4' : 'assets/intro-carrera.mp4';
  video.load();
}

document.getElementById('intro-skip').addEventListener('click', () => closeOpening());
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeOpening();
});
replay.addEventListener('click', () => playOpening(true));
reducedMotion.addEventListener('change', event => {
  if (event.matches) closeOpening(false);
});
if (!seenOpening() && !reducedMotion.matches && (!location.hash || location.hash === '#home')) {
  playOpening();
}

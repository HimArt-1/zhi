import { coffeeCrops } from './coffee-crops.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const photos = $('stage-photos');
const firstPoster = $('poster');
const tour = $('tour');
const markers = Array.from(stage.querySelectorAll('.marker'));
const stopButtons = document.querySelectorAll('[data-stop]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const stops = [
  { en: 'THE DISPLAY', title: 'البورش الزيتية', copy: '', model: 'Porsche 911 Carrera S (991.2)' },
  {
    en: 'THE COFFEE BAR', title: 'بار الرخام', copy: 'عروق خضراء تحيط بمكان تحضير القهوة.',
    file: 'tour-bar.webp', alt: 'بار زهي من الرخام الأخضر مع ماكينة الإسبريسو وأكواب خزفية'
  },
  {
    en: 'THE SEATING', title: 'الجلسات', copy: 'قماش عاجي وكراسٍ خفيفة بتوقيع زهي.',
    file: 'tour-seating.webp', alt: 'كراسٍ من القماش العاجي حول طاولة جوز مستديرة في مقهى زهي'
  },
  {
    en: 'THE FAÇADE', title: 'واجهة زهي', copy: 'نوافذ مستديرة وبلاط زيتوني عند المدخل.',
    file: 'tour-facade.webp', alt: 'واجهة مقهى زهي بشعار المقهى وأبواب خشبية وبلاط أخضر'
  }
];
const liveHint = 'اسحب لتغيير الزاوية، أو استخدم الأسهم وأزرار التقريب.';
const photoHint = 'اختر محطة أو استخدم الأسهم لتصفّح الصور.';
const photoCache = new Map();
const photoMotion = { duration: 680, easing: 'cubic-bezier(.22,.65,.25,1)' };
let current = 0, viewer, loading = false, live = false;
let poster = firstPoster, photoRequest = 0, photoTransition = Promise.resolve();

function preparePhoto(index) {
  if (photoCache.has(index)) return photoCache.get(index);
  const frame = index === 0 ? firstPoster : new Image(1600, 800);
  if (index !== 0) {
    frame.className = 'stage-poster';
    frame.dataset.photo = index;
    frame.alt = stops[index].alt;
    frame.src = 'assets/' + stops[index].file;
  }
  const ready = frame.decode().then(() => frame).catch(() => {
    photoCache.delete(index);
    return null;
  });
  photoCache.set(index, ready);
  return ready;
}

function renderStop(index) {
  const item = stops[index];
  const number = String(index + 1).padStart(2, '0');
  stage.dataset.station = index;
  $('scene-number').textContent = number;
  $('stop-en').textContent = number + ' / ' + item.en;
  $('stop-title').textContent = item.title;
  const model = live && item.model;
  const copy = $('stop-copy');
  copy.textContent = model || item.copy;
  copy.hidden = !copy.textContent;
  copy.lang = model ? 'en' : 'ar';
  stopButtons.forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.stop) === index)));
}

async function showPhoto(index, direction) {
  const request = ++photoRequest;
  const incoming = await preparePhoto(index);
  await photoTransition;
  if (request !== photoRequest) return;
  if (!incoming) {
    if (!live) {
      current = Number(poster.dataset.photo);
      renderStop(current);
      $('tour-hint').textContent = 'تعذّر تحميل الصورة. اختر المحطة مرة أخرى للمحاولة.';
    }
    return;
  }
  if (!live) {
    renderStop(index);
    if (!loading) $('tour-hint').textContent = photoHint;
  }
  if (incoming === poster) return;

  const outgoing = poster;
  outgoing.removeAttribute('id');
  outgoing.setAttribute('aria-hidden', 'true');
  incoming.id = 'poster';
  incoming.removeAttribute('aria-hidden');
  photos.append(incoming);
  poster = incoming;

  if (live || reduced.matches || typeof incoming.animate !== 'function') {
    outgoing.remove();
    return;
  }
  // The decoded frame fades over an opaque image, so the stage never flashes empty.
  const reveal = incoming.animate([
    { opacity: 0, transform: `translateX(${direction * 3}%) scale(1.07)` },
    { opacity: 1, transform: 'translateX(0) scale(1)' }
  ], photoMotion);
  outgoing.animate([
    { transform: 'translateX(0) scale(1)' },
    { transform: `translateX(${direction * -1.5}%) scale(1.04)` }
  ], photoMotion);
  photoTransition = reveal.finished.then(() => outgoing.remove(), () => outgoing.remove());
}

function selectStop(index) {
  const direction = index < current ? -1 : 1;
  current = (index + stops.length) % stops.length;
  if (live) {
    renderStop(current);
    viewer.goTo(current, !reduced.matches);
  }
  void showPhoto(current, direction);
}

function setLive(value) {
  live = value;
  if (live) {
    renderStop(current);
    viewer.goTo(current, false);
    viewer.resume();
  } else {
    viewer?.pause();
    renderStop(Number(poster.dataset.photo));
  }
  stage.classList.toggle('is-live', live);
  photos.setAttribute('aria-hidden', String(live));
  $('scene').setAttribute('aria-hidden', String(!live));
  $('mode-label').textContent = live ? 'LIVE 3D' : 'PHOTO TOUR';
  $('toggle-scene').querySelector('span').textContent = live ? 'عرض الصور' : 'ابدأ الجولة';
  $('scene-tools').hidden = !live;
  $('tour-hint').textContent = live ? liveHint : photoHint;
}
async function startScene() {
  if (loading || live) return;
  loading = true;
  const toggle = $('toggle-scene');
  toggle.setAttribute('aria-disabled', 'true');
  toggle.querySelector('span').textContent = 'تجهيز الجولة…';
  $('tour-hint').textContent = 'جارٍ تجهيز المشهد ثلاثي الأبعاد.';
  try {
    if (!viewer) {
      const [{ createTour }] = await Promise.all([import('./scene.js'), $('brand-logo').decode()]);
      viewer = await createTour($('scene'), {
        initial: current,
        brandImage: $('brand-logo'),
        onPins: points => points.forEach((point, index) => {
          const marker = markers[index];
          marker.dataset.visible = String(Boolean(point));
          if (!point) return;
          marker.style.setProperty('--pin-x', point.x + '%');
          marker.style.setProperty('--pin-y', point.y + '%');
        }),
        onLoss: () => {
          const lost = viewer;
          setLive(false);
          viewer = undefined;
          lost?.dispose();
          $('tour-hint').textContent = 'توقف عرض 3D. يمكنك متابعة الجولة بالصور أو المحاولة مرة أخرى.';
        }
      });
    }
    setLive(true);
  } catch {
    viewer?.dispose();
    viewer = undefined;
    setLive(false);
    $('tour-hint').textContent = 'عرض 3D غير متاح في هذا المتصفح. لا يزال بإمكانك استكشاف المحطات بالصور.';
  } finally {
    loading = false;
    toggle.removeAttribute('aria-disabled');
  }
}
stopButtons.forEach(el => el.addEventListener('click', () => selectStop(Number(el.dataset.stop))));
window.addEventListener('load', () => {
  for (let index = 1; index < stops.length; index++) void preparePhoto(index);
}, { once: true });
$('prev-stop').addEventListener('click', () => selectStop(current - 1));
$('next-stop').addEventListener('click', () => selectStop(current + 1));
$('toggle-scene').addEventListener('click', () => live ? setLive(false) : startScene());
$('zoom-in').addEventListener('click', () => viewer?.zoom(-0.15));
$('zoom-out').addEventListener('click', () => viewer?.zoom(0.15));
$('reset-scene').addEventListener('click', () => viewer?.goTo(current, !reduced.matches));
const fullscreen = $('fullscreen');
function expanded() { return document.fullscreenElement === tour || tour.classList.contains('is-expanded'); }
function syncFullscreen() { fullscreen.setAttribute('aria-label', expanded() ? 'إنهاء عرض ملء الشاشة' : 'تكبير الجولة إلى ملء الشاشة'); }
fullscreen.addEventListener('click', async () => {
  if (document.fullscreenElement === tour) { await document.exitFullscreen(); return; }
  if (tour.classList.contains('is-expanded')) tour.classList.remove('is-expanded');
  else {
    try { if (tour.requestFullscreen) await tour.requestFullscreen(); else tour.classList.add('is-expanded'); }
    catch { tour.classList.add('is-expanded'); }
  }
  syncFullscreen();
});
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && tour.classList.contains('is-expanded')) { tour.classList.remove('is-expanded'); syncFullscreen(); }
});
$('show-seating').addEventListener('click', () => {
  selectStop(2);
  tour.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' });
  $('toggle-scene').focus({ preventScroll: true });
});
function updateNav() {
  const hash = ['#menu', '#visit'].includes(location.hash) ? location.hash : '#home';
  document.querySelectorAll('.masthead nav a[href^="#"]').forEach(a => {
    if (a.hash === hash) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
}
window.addEventListener('hashchange', updateNav);
updateNav();

const F = window.RatioFlow;
const orderStore = 'zhi-coffee.preview.orders.v1';
const bookingStore = 'zhi-coffee.preview.bookings.v1';
function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
const state = F.hydrate(read(orderStore));
const savedBookings = read(bookingStore);
const bookings = Array.isArray(savedBookings) ? savedBookings.filter(item => item && typeof item.date === 'string' && typeof item.time === 'string' && typeof item.zone === 'string' && Number.isInteger(item.party)) : [];
const origins = [...new Set(coffeeCrops.map(crop => crop.origin))];
const modeNames = { pickup: 'استلام من الفرع', dinein: 'على الطاولة', car: 'استلام بالسيارة' };
const orderLabels = { confirmed: 'مؤكد', preparing: 'قيد التحضير', ready: 'جاهز للاستلام', completed: 'مكتمل', cancelled: 'ملغى' };
let originFilter = '', toastTimer, detailReturn;
const money = amount => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amount);
function el(tag, label = '', cls) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  if (cls) node.className = cls;
  return node;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  use.setAttribute('href', '#' + name);
  svg.append(use);
  return svg;
}
function button(label, cls, action, glyph) {
  const node = el('button', glyph ? '' : label, cls); node.type = 'button';
  if (glyph) { node.append(icon(glyph)); node.setAttribute('aria-label', label); }
  node.addEventListener('click', action);
  return node;
}
function say(value) {
  clearTimeout(toastTimer);
  $('toast').textContent = value;
  $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3100);
}
function save() {
  if (!write(orderStore, state)) say('تغييرات السلة متاحة إلى أن تغلق الصفحة.');
  updateCount();
}
function updateCount() { $('bag-count').textContent = state.cart.reduce((sum, line) => sum + line.qty, 0); }
function open(id) { const dialog = $(id); if (!dialog.open) dialog.showModal(); }
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) dialog.close();
  });
}
function productPhoto(p, size, className) {
  const img = el('img', '', className);
  img.src = 'assets/' + p.image + '-' + size + '.webp';
  img.alt = 'صورة توضيحية: ' + p.name.ar;
  img.width = size; img.height = size; img.loading = 'lazy';
  return img;
}
const normalize = str => str.toLowerCase().normalize('NFD').replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036f]/g, '').replace(/ى/g, 'ي');
function showMenu() {
  const query = normalize($('search').value.trim());
  const list = coffeeCrops.filter(crop => (!originFilter || crop.origin === originFilter) &&
    normalize([crop.name, crop.origin, crop.notes].join(' ')).includes(query));
  $('products').replaceChildren(...list.map(crop => {
    const item = el('article', '', 'product');
    item.dataset.product = crop.id;
    const photo = el('a', '', 'product-photo');
    photo.href = crop.url;
    photo.setAttribute('aria-label', crop.name + ' في متجر زهي');
    const image = el('img');
    image.src = 'assets/zhi-crop-' + crop.id + '.webp';
    image.alt = 'عبوة ' + crop.name + ' من زهي';
    image.loading = 'lazy';
    image.decoding = 'async';
    photo.append(image);
    const store = el('a', 'في المتجر', 'product-store-link');
    store.href = crop.url;
    store.append(icon('diagonal'));
    const foot = el('div', '', 'product-foot');
    foot.append(el('strong', money(crop.price)), store);
    item.append(photo, el('p', crop.origin + ' · ٢٥٠ جم'), el('h3', crop.name),
      el('p', crop.notes, 'crop-notes'), foot);
    return item;
  }));
  $('empty-menu').hidden = Boolean(list.length);
}
for (const origin of ['', ...origins]) {
  const filter = button(origin || 'كل المحاصيل', '', () => {
    originFilter = origin;
    Array.from($('filters').children).forEach((child) => child.setAttribute('aria-pressed', String(child === filter)));
    showMenu();
  });
  filter.setAttribute('aria-pressed', String(origin === originFilter));
  $('filters').append(filter);
}
$('search').addEventListener('input', showMenu);
function selectField(name, title, options, selected, onChange) {
  const label = el('label', title, 'field'), select = el('select');
  select.name = name;
  for (const [value, text] of Object.entries(options)) {
    const opt = el('option', text); opt.value = value; select.append(opt);
  }
  select.value = selected;
  select.addEventListener('change', () => onChange(select.value));
  label.append(select);
  return label;
}
const customization = {
  size: ['الحجم', { regular: 'عادي', large: 'كبير' }],
  grind: ['الطحن', { whole: 'حبوب كاملة', v60: 'فلتر V60', espresso: 'إسبريسو', french: 'فرنش برس' }],
  milk: ['الحليب', { fresh: 'كامل الدسم', low: 'قليل الدسم', oat: 'شوفان', almond: 'لوز' }],
  extraShot: ['شوت إضافي', { false: 'بدون', true: 'إضافة شوت' }]
};
function showProduct(p, existing) {
  const opts = F.options(p.id, existing?.options);
  let qty = existing?.qty ?? 1;
  const head = el('div', '', 'panel-head'), title = el('h2', p.name.ar);
  title.id = 'product-title';
  head.append(title, button('إغلاق تفاصيل المنتج', 'icon-button', () => $('product-dialog').close(), 'close'));
  const fields = el('div', '', 'options'), footer = el('div', '', 'detail-actions'), amount = el('output');
  function update() { amount.textContent = money(F.unitPrice(p.id, opts) * qty); }
  for (const [key, value] of Object.entries(opts)) {
    const [label, values] = customization[key];
    const options = Object.fromEntries(Object.entries(values).map(([value, text]) => {
      const extra = F.optionPrice(key, value);
      return [value, extra ? text + ' (+' + money(extra) + ')' : text];
    }));
    fields.append(selectField(key, label, options, String(value), v => { opts[key] = key === 'extraShot' ? v === 'true' : v; update(); }));
  }
  if (!existing) fields.append(selectField('quantity', 'الكمية', Object.fromEntries([1,2,3,4,5,6,7,8,9,10].map(n => [n, n])), '1', n => { qty = Number(n); update(); }));
  footer.append(amount, button(existing ? 'احفظ التعديل' : 'أضف للسلة', 'solid-button', () => {
    if (existing) F.edit(state, existing.key, opts); else F.add(state, p.id, opts, qty);
    save();
    $('product-dialog').close();
    if (!existing) say('أضفنا اختيارك للسلة.');
  }));
  const image = productPhoto(p, 640, 'detail-photo'); image.loading = 'eager';
  $('product-detail').replaceChildren(head, image, el('p', p.desc.ar, 'detail-copy'), fields, footer);
  update();
  detailReturn = existing ? $('cart-open') : null;
  if (existing) $('cart-dialog').close();
  open('product-dialog');
}
$('product-dialog').addEventListener('close', () => {
  if (detailReturn) { detailReturn = null; showCart(); }
});
function showCart() { renderCart(); open('cart-dialog'); }
function renderCart(focus) {
  const lines = $('cart-lines');
  const mode = $('cart-dialog').open ? $('service').value : state.service.mode;
  const table = $('cart-dialog').open ? $('service-table').value : state.service.table;
  lines.replaceChildren();
  for (const line of state.cart) {
    const item = el('article', '', 'cart-line'), summary = el('div'), controls = el('div', '', 'quantity'), p = F.product(line.productId);
    summary.append(el('h3', p.name.ar), el('p', money(F.linePrice(line) * line.qty)));
    if (Object.keys(line.options).length) summary.append(button('تعديل الخيارات', 'edit-line', () => showProduct(p, line)));
    for (const [delta, label, glyph] of [[-1, 'قلّل الكمية', 'minus'], [1, 'زد الكمية', 'plus']]) {
      const control = button(label + ' — ' + p.name.ar, '', () => { F.quantity(state, line.key, delta); save(); renderCart([line.key, delta]); }, glyph);
      if (delta === 1) controls.append(el('span', String(line.qty)));
      controls.append(control);
      if (focus?.[0] === line.key && focus[1] === delta) queueMicrotask(() => control.focus());
    }
    item.append(summary, controls); lines.append(item);
  }
  if (!state.cart.length) lines.append(el('p', 'السلة فارغة. اختر شيئًا من القائمة أولًا.', 'empty'));
  $('checkout').hidden = !state.cart.length;
  $('cart-total').textContent = money(F.total(state.cart));
  $('service').value = mode;
  $('service-table').value = table || '01';
  $('order-table').hidden = $('service').value !== 'dinein';
  if (focus && !state.cart.some(line => line.key === focus[0])) $('cart-dialog').querySelector('[data-close]').focus();
}
$('cart-open').addEventListener('click', showCart);
$('service').addEventListener('change', () => { $('order-table').hidden = $('service').value !== 'dinein'; });
$('checkout').addEventListener('submit', event => {
  event.preventDefault();
  if (!F.setService(state, $('service').value, $('service-table').value)) return;
  const id = F.place(state, state.revision);
  if (!id) return;
  save();
  $('cart-dialog').close();
  showActivity();
});
function todayAtZhi() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts();
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return values.year + '-' + values.month + '-' + values.day;
}
$('booking-open').addEventListener('click', () => {
  const date = $('booking-date'), today = todayAtZhi();
  date.min = today;
  if (!date.value || date.value < today) date.value = today;
  open('booking-dialog');
});
$('booking-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  bookings.unshift({ id: crypto.randomUUID(), date: data.get('date'), time: data.get('time'), zone: data.get('zone'), party: Number(data.get('party')) });
  write(bookingStore, bookings);
  $('booking-dialog').close();
  showActivity();
});
function showActivity() {
  const body = $('activity-body'); body.replaceChildren();
  body.append(el('p', 'هذا سجل تجريبي في متصفحك. لم تُرسل أي طلبات أو حجوزات إلى المقهى.', 'small-note'));
  for (const [title, items, render] of [
    ['طلباتي', state.orders, order => {
      const line = el('li', '', 'activity-line'), desc = el('span'), actions = el('div', '', 'activity-actions');
      desc.append(el('strong', order.id + ' · ' + money(F.total(order.items))), el('small', modeNames[order.service.mode] + ' · ' + orderLabels[order.status]));
      line.append(desc, actions);
      if (order.status === 'confirmed') actions.append(button('إلغاء الطلب', '', () => { F.cancelOrder(state, order.id); save(); showActivity(); }));
      if (['confirmed', 'preparing', 'ready'].includes(order.status)) actions.append(button('جرّب الحالة التالية', '', () => { F.advance(state, order.id, order.status); save(); showActivity(); }));
      return line;
    }],
    ['حجوزاتي', bookings, booking => {
      const line = el('li');
      line.append(el('span', booking.date + ' · ' + booking.time + ' · ' + booking.zone + ' · ' + booking.party + ' ضيوف'),
        button('إلغاء الحجز', '', () => { bookings.splice(bookings.indexOf(booking), 1); write(bookingStore, bookings); showActivity(); }));
      return line;
    }]
  ]) {
    body.append(el('h3', title));
    if (!items.length) body.append(el('p', 'لا يوجد شيء هنا بعد.', 'small-note'));
    else {
      const list = el('ul', '', 'activity-list'); list.append(...items.map(render)); body.append(list);
    }
  }
  const stamps = Math.min(F.loyalty(state).length, 6), pass = el('p', '', 'loyalty-pass');
  pass.append(el('strong', 'بطاقة الولاء التجريبية'), el('span', ' · ' + stamps + ' من 6 أختام'));
  body.append(pass);
  open('activity-dialog');
}
$('activity-open').addEventListener('click', showActivity);
updateCount();
showMenu();

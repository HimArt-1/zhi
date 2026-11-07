import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createPreviewServer } from '../scripts/preview-zhi.mjs';

let server, browser, base;
before(async () => {
  server = createPreviewServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
});
after(async () => {
  await browser?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});
async function pageFor(t, options = {}, init) {
  const page = await browser.newPage({ reducedMotion: 'reduce', ...options });
  t.after(() => page.close());
  const unexpected = [];
  page.on('pageerror', error => unexpected.push(error.message));
  page.on('request', req => {
    const { origin, pathname } = new URL(req.url());
    if (origin !== base || pathname.startsWith('/api/')) unexpected.push(req.url());
  });
  page.on('response', res => { if (res.status() >= 400) unexpected.push(res.status() + ' ' + res.url()); });
  t.after(() => assert.deepEqual(unexpected, []));
  if (init) await page.addInitScript(init);
  await page.goto(base + '/');
  return page;
}

test('opening film plays once, can be skipped, and can be replayed', async t => {
  const page = await pageFor(t, { viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  const opening = page.locator('#site-intro');
  await opening.waitFor();
  await page.waitForFunction(() => document.querySelector('#site-intro video').currentTime > 0);
  assert.equal(await opening.locator('video').getAttribute('src'), 'assets/intro-carrera.mp4');
  await page.locator('#intro-skip').click();
  await opening.waitFor({ state: 'hidden' });
  await page.reload();
  assert.equal(await opening.locator('video').getAttribute('src'), null);
  await page.locator('#intro-replay').click();
  await opening.waitFor();
  await page.keyboard.press('Escape');
  await opening.waitFor({ state: 'hidden' });
});

test('portrait opening finishes and returns access to the homepage', async t => {
  const page = await pageFor(t, {
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference'
  });
  const opening = page.locator('#site-intro');
  await opening.waitFor();
  assert.equal(await opening.locator('video').getAttribute('src'), 'assets/intro-carrera-portrait.mp4');
  await opening.waitFor({ state: 'hidden', timeout: 8500 });
  await page.locator('#next-stop').click();
  await page.locator('#poster[src$="tour-bar.webp"]').waitFor();
});

test('opens the branded 3D tour, moves the camera, and switches to the exterior', async t => {
  const page = await pageFor(t, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  assert.equal(await page.locator('#site-intro video').getAttribute('src'), null);
  assert.match(await page.locator('#brand-logo').getAttribute('src'), /logo\.webp$/);
  await page.locator('#toggle-scene').click();
  await page.waitForSelector('#stage.is-live', { timeout: 15000 });
  const canvas = page.locator('#scene canvas');
  const pin = page.locator('.marker[data-stop="0"]');
  await pin.waitFor();
  const before = await pin.evaluate(node => node.style.getPropertyValue('--pin-x'));
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(previous => document.querySelector('.marker[data-stop="0"]').style.getPropertyValue('--pin-x') !== previous, before);
  await page.locator('.tour-stops [data-stop="3"]').click();
  await page.locator('.marker[data-stop="3"]').waitFor();
  assert.equal(await page.locator('#scene-number').textContent(), '04');
  assert.equal(await page.locator('#stop-title').textContent(), 'واجهة زهي');
  await page.locator('#toggle-scene').click();
  assert.equal(await page.locator('#stage.is-live').count(), 0);
  await page.locator('#poster[src$="tour-facade.webp"]').waitFor();
});

test('phone layout and photo stations work when WebGL is unavailable', async t => {
  const page = await pageFor(t, { viewport: { width: 320, height: 730 }, isMobile: true, hasTouch: true }, () => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...options) { return /webgl/.test(type) ? null : get.call(this, type, ...options); };
  });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
  const [stage, rail] = await Promise.all([page.locator('#stage').boundingBox(), page.locator('.tour-rail').boundingBox()]);
  assert.equal(stage.x, rail.x);
  assert.equal(stage.width, rail.width);
  await page.locator('#toggle-scene').click();
  await page.waitForFunction(() => document.querySelector('#tour-hint').textContent.includes('غير متاح'));
  await page.locator('#next-stop').click();
  await page.locator('#poster[src$="tour-bar.webp"]').waitFor();
  assert.equal(await page.locator('#scene-number').textContent(), '02');
  assert.equal(await page.locator('#stage.is-live').count(), 0);
});

test('photo tour crossfades decoded station images and finishes on the latest selection', async t => {
  const page = await pageFor(t, { reducedMotion: 'no-preference' }, () => {
    sessionStorage.setItem('zhi.opening-film.seen.v3', '1');
  });
  await page.locator('#next-stop').click();
  const bar = page.locator('#poster[src$="tour-bar.webp"]');
  await bar.waitFor();
  assert.equal(await bar.evaluate(image => image.complete && image.naturalWidth > 0), true);
  assert.equal(await page.locator('#stage-photos img[src$="tour-car.webp"]').count(), 1);
  await page.locator('.tour-stops [data-stop="2"]').click();
  await page.locator('.tour-stops [data-stop="3"]').click();
  await page.locator('#poster[src$="tour-facade.webp"]').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('#stage-photos img').length === 1);
  assert.equal(await page.locator('#scene-number').textContent(), '04');
  await page.locator('#prev-stop').click();
  await page.locator('#poster[src$="tour-seating.webp"]').waitFor();
  assert.equal(await page.locator('#stop-title').textContent(), 'الجلسات');
});

test('official coffee cards support origin filters, search and storefront links', async t => {
  const page = await pageFor(t);
  assert.equal(await page.locator('#menu-title').textContent(), 'وش قهوتك؟');
  assert.equal(await page.locator('.product').count(), 5);
  await page.getByRole('button', { name: 'كولومبيا', exact: true }).click();
  assert.equal(await page.locator('.product').count(), 3);
  await page.locator('#search').fill('خوخ فاخر');
  assert.equal(await page.locator('.product').count(), 1);
  assert.match(await page.locator('.product-store-link').getAttribute('href'), /^https:\/\/zhi-coffee\.com\/.*\/p1768314619$/);
  await page.locator('.product-photo img').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.product-photo img').evaluate(async img => {
    await img.decode();
    return img.naturalWidth > 0;
  }), true);
});

test('existing demo cart, order status, loyalty, and booking stay available', async t => {
  const page = await pageFor(t, {}, () => {
    localStorage.setItem('ratio-taif-prototype.flow.v2', 'original');
    if (!localStorage.getItem('zhi-coffee.preview.orders.v1')) {
      localStorage.setItem('zhi-coffee.preview.orders.v1', JSON.stringify({
        version: 3, cart: [{ productId: 'esp-3', qty: 1, options: { milk: 'oat' } }]
      }));
    }
  });
  await page.reload();
  assert.equal(await page.locator('#bag-count').textContent(), '1');
  await page.locator('#cart-open').click();
  await page.locator('#service').selectOption('dinein');
  await page.locator('#service-table').selectOption('02');
  await page.getByRole('button', { name: 'تأكيد الطلب التجريبي' }).click();
  await page.locator('#activity-dialog[open]').waitFor();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'جرّب الحالة التالية' }).click();
  assert.match(await page.locator('#activity-body').textContent(), /R-0001.*مكتمل.*1 من 6/);
  await page.getByRole('button', { name: 'إغلاق السجل' }).click();
  await page.locator('#booking-open').click();
  await page.getByRole('button', { name: 'احفظ الحجز التجريبي' }).click();
  assert.match(await page.locator('#activity-body').textContent(), /18:00/);
  await page.getByRole('button', { name: 'إلغاء الحجز' }).click();
  assert.doesNotMatch(await page.locator('#activity-body').textContent(), /18:00/);
  assert.equal(await page.evaluate(() => localStorage.getItem('ratio-taif-prototype.flow.v2')), 'original');
});

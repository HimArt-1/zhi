(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'));
  else root.RatioFlow = factory(root.RATIO_CATALOG);
})(typeof window === 'undefined' ? globalThis : window, function (source) {
  'use strict';
  const catalog = source.products.filter(p => p.preview);
  const ids = catalog.map(p => p.id);
  const products = new Map(source.products.map(p => [p.id, p]));
  const product = id => products.get(id);
  const phases = ['confirmed', 'preparing', 'ready', 'completed'];
  const modes = ['pickup', 'car', 'dinein'];
  const seats = ['داخلية', 'خارجية', 'البار'];
  const tables = ['01', '02', '03']; // Explicit demonstration identifiers, not a floor plan.
  function fresh() {
    return { version: 3, revision: 0, cartId: null, cart: [], service: { mode: 'pickup', table: null }, ticket: null, ticketSequence: 0, orderSequence: 0, orders: [] };
  }
  function options(id, input = {}) {
    input = input && typeof input === 'object' ? input : {};
    if (id === 'bean-1') return { grind: ['whole', 'v60', 'espresso', 'french'].includes(input.grind) ? input.grind : 'whole' };
    if (id === 'drip-2') return { size: input.size === 'large' ? 'large' : 'regular' };
    if (id === 'esp-3') return {
      size: input.size === 'large' ? 'large' : 'regular',
      milk: ['fresh', 'low', 'oat', 'almond'].includes(input.milk) ? input.milk : 'fresh',
      extraShot: input.extraShot === true
    };
    return {};
  }
  function optionPrice(name, value) { return source.optionPrices[name]?.[String(value)] || 0; }
  function unitPrice(id, input) {
    if (!product(id)) return 0;
    const o = options(id, input);
    return product(id).price + Object.entries(o).reduce((sum, [name, value]) => sum + optionPrice(name, value), 0);
  }
  function key(id, input) { return id + '|' + JSON.stringify(options(id, input)); }
  function validLine(line, historical = false) {
    if (!line || !(historical ? products.has(line.productId) : ids.includes(line.productId)) || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) return null;
    return { key: key(line.productId, line.options), productId: line.productId, options: options(line.productId, line.options), qty: line.qty };
  }
  function orderLine(line, version) {
    const valid = validLine(line, true);
    if (!valid) return null;
    // Version 2 never stored prices; freeze its current price once during migration.
    const price = version === 2 ? unitPrice(valid.productId, valid.options) : line.unitPrice;
    if (!Number.isFinite(price) || price < 0) return null;
    return { ...valid, unitPrice: price };
  }
  function service(input) {
    const mode = modes.includes(input?.mode) ? input.mode : 'pickup';
    if (mode === 'dinein' && /^[a-f0-9-]{36}$/.test(input?.reservationId) && /^[a-f0-9-]{36}$/.test(input?.table) && typeof input?.tableName === 'string') return { mode, table: input.table, tableName: input.tableName.slice(0, 60), reservationId: input.reservationId };
    return { mode, table: mode === 'dinein' && tables.includes(input?.table) ? input.table : null };
  }
  function hydrate(input) {
    const s = fresh();
    if (!input || ![2, 3].includes(input.version)) return s;
    s.revision = Number.isSafeInteger(input.revision) && input.revision >= 0 ? input.revision : 0;
    if (/^[a-f0-9-]{36}$/.test(input.cartId)) s.cartId = input.cartId;
    s.cart = Array.isArray(input.cart) ? input.cart.map(line => validLine(line)).filter(Boolean) : [];
    if (s.cart.length && !s.cartId) s.cartId = crypto.randomUUID();
    s.service = service(input.service);
    s.orderSequence = Number.isSafeInteger(input.orderSequence) && input.orderSequence >= 0 ? input.orderSequence : 0;
    s.ticketSequence = Number.isSafeInteger(input.ticketSequence) && input.ticketSequence >= 0 ? input.ticketSequence : 0;
    const t = input.ticket;
    if (!s.service.reservationId && t && /^W-\d+$/.test(t.id) && [1, 2, 4, 6].includes(t.party) && seats.includes(t.seat) && ['waiting', 'ready', 'seated'].includes(t.status)) {
      s.ticket = { id: t.id, party: t.party, seat: t.seat, status: t.status, table: tables.includes(t.table) ? t.table : '01' };
      s.ticketSequence = Math.max(s.ticketSequence, Number(t.id.slice(2)));
      if (s.service.mode === 'dinein' && s.service.table) {
        s.ticket.status = 'seated'; s.ticket.table = s.service.table;
      } else if (s.ticket.status === 'seated') s.ticket = null;
    }
    const seen = new Set();
    for (const order of Array.isArray(input.orders) ? input.orders : []) {
      if (!order || !/^R-\d+$/.test(order.id) || seen.has(order.id) || ![...phases, 'cancelled'].includes(order.status) || !Number.isFinite(order.createdAt)) continue;
      const lines = Array.isArray(order.items) ? order.items.map(line => orderLine(line, input.version)).filter(Boolean) : [];
      if (!lines.length) continue;
      seen.add(order.id);
      s.orders.push({ id: order.id, items: lines, service: service(order.service), status: order.status, createdAt: order.createdAt, completedAt: Number.isFinite(order.completedAt) ? order.completedAt : null });
      s.orderSequence = Math.max(s.orderSequence, Number(order.id.slice(2)));
    }
    return s;
  }
  function add(s, id, input, qty = 1) {
    if (!ids.includes(id) || !Number.isInteger(qty) || qty < 1) return false;
    if (!s.cart.length) s.cartId = crypto.randomUUID();
    const k = key(id, input);
    const found = s.cart.find(line => line.key === k);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else s.cart.push({ key: k, productId: id, options: options(id, input), qty: Math.min(99, qty) });
    s.revision++; return true;
  }
  function quantity(s, k, delta) {
    const line = s.cart.find(item => item.key === k);
    if (!line || !Number.isInteger(delta)) return false;
    line.qty = Math.min(99, line.qty + delta);
    if (line.qty <= 0) s.cart = s.cart.filter(item => item.key !== k);
    s.revision++; return true;
  }
  function remove(s, k) {
    if (!s.cart.some(line => line.key === k)) return false;
    s.cart = s.cart.filter(line => line.key !== k); s.revision++; return true;
  }
  function edit(s, k, input) {
    const old = s.cart.find(line => line.key === k);
    if (!old) return false;
    const qty = old.qty, id = old.productId;
    s.cart = s.cart.filter(line => line.key !== k);
    return add(s, id, input, qty);
  }
  function setService(s, mode, table) {
    if (!modes.includes(mode) || (mode === 'dinein' && !tables.includes(table))) return false;
    s.service = service({ mode, table });
    if (mode !== 'dinein') s.ticket = null;
    else if (s.ticket) { s.ticket.status = 'seated'; s.ticket.table = s.service.table; }
    s.revision++; return true;
  }
  function setReservationService(s, reservation) {
    if (reservation?.status !== 'seated') return false;
    const next = service({ mode: 'dinein', table: reservation.tableId, tableName: reservation.tableName, reservationId: reservation.id });
    if (!next.reservationId) return false;
    s.service = next; s.ticket = null; s.revision++; return true;
  }
  function join(s, party, seat) {
    if (s.ticket || ![1, 2, 4, 6].includes(party) || !seats.includes(seat)) return false;
    if (s.service.mode === 'dinein') setService(s, 'pickup', null);
    s.ticketSequence++;
    s.ticket = { id: 'W-' + String(s.ticketSequence).padStart(3, '0'), party, seat, status: 'waiting', table: '01' };
    return true;
  }
  function ticketReady(s) {
    if (s.ticket?.status !== 'waiting') return false;
    s.ticket.status = 'ready'; return true;
  }
  function takeTable(s) {
    if (s.ticket?.status !== 'ready') return false;
    return setService(s, 'dinein', s.ticket.table);
  }
  function cancelTicket(s) {
    if (!s.ticket || s.ticket.status === 'seated') return false;
    s.ticket = null; return true;
  }
  function linePrice(line) { return line.unitPrice ?? unitPrice(line.productId, line.options); }
  function total(lines) { return lines.reduce((sum, line) => sum + linePrice(line) * line.qty, 0); }
  function place(s, expectedRevision, now = Date.now()) {
    if (!s.cart.length || expectedRevision !== s.revision || (s.service.mode === 'dinein' && !s.service.table)) return null;
    const items = s.cart.map(line => ({ ...line, options: { ...line.options }, unitPrice: unitPrice(line.productId, line.options) }));
    const order = { id: 'R-' + String(++s.orderSequence).padStart(4, '0'), items, service: { ...s.service }, status: 'confirmed', createdAt: now, completedAt: null };
    s.orders.unshift(order); s.cart = []; s.revision++;
    return order.id;
  }
  function advance(s, id, expectedStatus, now = Date.now()) {
    const order = s.orders.find(item => item.id === id);
    if (!order || order.status !== expectedStatus) return false;
    const index = phases.indexOf(order.status);
    if (index < 0 || index >= phases.length - 1) return false;
    order.status = phases[index + 1];
    if (order.status === 'completed') order.completedAt = now;
    return true;
  }
  function cancelOrder(s, id) {
    const order = s.orders.find(item => item.id === id);
    if (order?.status !== 'confirmed') return false;
    order.status = 'cancelled'; return true;
  }
  function loyalty(s) {
    return s.orders.filter(order => order.status === 'completed').map(order => ({ orderId: order.id, time: order.completedAt || order.createdAt }));
  }
  function acceptOrder(s, cartId, revision) {
    if (s.cartId !== cartId || s.revision !== revision || !s.cart.length) return false;
    s.cart = []; s.revision++; return true;
  }
  return { catalog, product, ids, phases, tables, fresh, hydrate, options, optionPrice, unitPrice, linePrice, key, total, add, quantity, remove, edit, setService, setReservationService, join, ticketReady, takeTable, cancelTicket, place, advance, cancelOrder, loyalty, acceptOrder };
});

/**
 * Realtime engine.
 *
 * Honest note on "real-time": there is no live POS/CCTV/HR feed wired into this
 * demo (that hardware doesn't exist here). What IS real: every event below is a
 * genuine row written to the SQLite database, and the moment it's written it is
 * pushed to every connected browser over a live WebSocket — so what you see on
 * screen updates without a page refresh, exactly like it would against a real feed.
 * Swap this interval-based generator for real POS/ERP webhooks later and nothing
 * on the frontend has to change, because it already reacts to socket events.
 */
const db = require('./db');

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function round2(n) { return Math.round(n * 100) / 100; }
function todayIso() { return new Date().toISOString().slice(0, 10); }

function initRealtime(io) {
  const outlets = db.prepare('SELECT id, code, name FROM outlets').all();
  const products = db.prepare('SELECT id, name, unit_price FROM products').all();

  // 1) New sale roughly every 6-14 seconds
  const salesTimer = setInterval(() => {
    const outlet = pick(outlets);
    const product = pick(products);
    const qty = Math.ceil(Math.random() * 4);
    const revenue = round2(qty * product.unit_price);
    db.prepare('INSERT INTO sales (outlet_id, product_id, date, quantity, revenue, discount) VALUES (?,?,?,?,?,0)')
      .run(outlet.id, product.id, todayIso(), qty, revenue);
    // keep inventory in sync
    db.prepare('UPDATE inventory SET stock_on_hand = MAX(0, stock_on_hand - ?) WHERE outlet_id = ? AND product_id = ?')
      .run(qty, outlet.id, product.id);

    io.emit('sale:new', {
      outletId: outlet.id, outletName: outlet.name, outletCode: outlet.code,
      product: product.name, quantity: qty, revenue, at: new Date().toISOString(),
    });
  }, 8000 + Math.random() * 6000);

  // 2) Occasional low-stock / notification event every 20-40 seconds
  const notifTimer = setInterval(() => {
    const outlet = pick(outlets);
    const events = [
      { event_type: 'low_stock', priority: 'high', channel: 'push', title: 'Low stock cover on fast-moving item', message: `${pick(products).name} is running low at ${outlet.name}.` },
      { event_type: 'sales_dip', priority: 'medium', channel: 'push', title: 'Sales pace update', message: `${outlet.name} is trending below its weekly target pace.` },
      { event_type: 'compliance', priority: 'critical', channel: 'sms', title: 'Compliance flag raised', message: `A checklist item failed during today's spot-check at ${outlet.name}.` },
      { event_type: 'campaign', priority: 'low', channel: 'email', title: 'Campaign milestone', message: 'An active campaign just crossed a new conversion milestone.' },
    ];
    const e = pick(events);
    const info = db.prepare(`INSERT INTO notifications (outlet_id, event_type, channel, priority, title, message, status, created_at) VALUES (?,?,?,?,?,?, 'sent', datetime('now'))`)
      .run(outlet.id, e.event_type, e.channel, e.priority, e.title, e.message);
    const notification = db.prepare('SELECT n.*, o.name AS outlet_name, o.code AS outlet_code FROM notifications n JOIN outlets o ON o.id = n.outlet_id WHERE n.id = ?').get(info.lastInsertRowid);
    io.emit('notification:new', notification);
  }, 20000 + Math.random() * 20000);

  return () => { clearInterval(salesTimer); clearInterval(notifTimer); };
}

module.exports = { initRealtime };

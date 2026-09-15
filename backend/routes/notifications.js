const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function computeKpis(rows) {
  const total = rows.length;
  const acknowledged = rows.filter((r) => r.acknowledged_at).length;
  const open = rows.filter((r) => r.status === 'sent' || r.status === 'escalated').length;
  const escalated = rows.filter((r) => r.status === 'escalated').length;
  const resolvedRows = rows.filter((r) => r.resolved_at);
  const avgResolutionHrs = resolvedRows.length
    ? Math.round((resolvedRows.reduce((s, r) => s + (new Date(r.resolved_at) - new Date(r.created_at)) / 3600000, 0) / resolvedRows.length) * 10) / 10
    : 0;
  return {
    notificationsSent: total,
    acknowledgementRatePct: total ? Math.round((acknowledged / total) * 1000) / 10 : 0,
    openActions: open,
    slaBreaches: escalated,
    avgResolutionHrs,
  };
}

router.get('/summary', (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, o.name AS outlet_name, o.code AS outlet_code FROM notifications n
    LEFT JOIN outlets o ON o.id = n.outlet_id
    ORDER BY n.created_at DESC
  `).all();

  const byChannel = {};
  rows.forEach((r) => { byChannel[r.channel] = (byChannel[r.channel] || 0) + 1; });

  const byPriority = { low: 0, medium: 0, high: 0, critical: 0 };
  rows.forEach((r) => { byPriority[r.priority] = (byPriority[r.priority] || 0) + 1; });

  res.json({
    kpis: computeKpis(rows),
    byChannel,
    byPriority,
    feed: rows.slice(0, 60).map((r) => ({
      id: r.id, outlet: r.outlet_name, outletCode: r.outlet_code, eventType: r.event_type,
      channel: r.channel, priority: r.priority, title: r.title, message: r.message,
      status: r.status, createdAt: r.created_at, acknowledgedAt: r.acknowledged_at,
      escalatedAt: r.escalated_at, resolvedAt: r.resolved_at,
    })),
  });
});

router.post('/:id/acknowledge', (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found.' });
  db.prepare(`UPDATE notifications SET status = 'acknowledged', acknowledged_at = datetime('now') WHERE id = ?`).run(notif.id);
  const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notif.id);
  req.app.get('io')?.emit('notification:updated', updated);
  res.json({ notification: updated });
});

router.post('/:id/resolve', (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found.' });
  db.prepare(`UPDATE notifications SET status = 'resolved', resolved_at = datetime('now'), acknowledged_at = COALESCE(acknowledged_at, datetime('now')) WHERE id = ?`).run(notif.id);
  const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notif.id);
  req.app.get('io')?.emit('notification:updated', updated);
  res.json({ notification: updated });
});

module.exports = router;

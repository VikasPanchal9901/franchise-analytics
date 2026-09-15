const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const priority = req.query.priority && ['Low', 'Medium', 'High', 'Critical'].includes(req.query.priority) ? req.query.priority : null;
  const actionStatus = req.query.action_status && ['pending', 'in_progress', 'completed', 'verified'].includes(req.query.action_status) ? req.query.action_status : null;
  const audits = db.prepare(`
    SELECT a.*, o.name AS outlet_name, o.code AS outlet_code FROM audits a
    JOIN outlets o ON o.id = a.outlet_id ORDER BY a.date DESC
  `).all();
  const violations = db.prepare(`
    SELECT v.*, o.name AS outlet_name, o.code AS outlet_code FROM violations v
    JOIN outlets o ON o.id = v.outlet_id ORDER BY v.detected_at DESC
  `).all();
  const actions = db.prepare(`
    SELECT ca.*, v.category, v.severity, v.outlet_id, o.name AS outlet_name
    FROM corrective_actions ca
    JOIN violations v ON v.id = ca.violation_id
    JOIN outlets o ON o.id = v.outlet_id
    ORDER BY ca.due_date ASC
  `).all();

  const avgCompliance = audits.length ? Math.round((audits.reduce((s, a) => s + a.score, 0) / audits.length) * 10) / 10 : 0;
  const avgChecklist = audits.length ? Math.round((audits.reduce((s, a) => s + a.checklist_score, 0) / audits.length) * 10) / 10 : 0;
  const openIssues = violations.filter((v) => v.status === 'open' || v.status === 'in_progress').length;

  const closedActions = actions.filter((a) => a.status === 'completed' && a.closed_at);
  const avgClosureDays = closedActions.length
    ? Math.round((closedActions.reduce((s, a) => s + Math.max(0, (new Date(a.due_date) - new Date(a.closed_at)) / 86400000 + 5), 0) / closedActions.length) * 10) / 10
    : 0;

  const severityBreakdown = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  violations.forEach((v) => { severityBreakdown[v.severity] = (severityBreakdown[v.severity] || 0) + 1; });

  const complianceByOutlet = db.prepare(`
    SELECT o.id, o.name, o.code, ROUND(AVG(a.score),1) AS avg_score, COUNT(a.id) AS audit_count
    FROM outlets o LEFT JOIN audits a ON a.outlet_id = o.id
    GROUP BY o.id ORDER BY avg_score ASC
  `).all();

  const categoryBreakdown = {};
  violations.forEach((v) => { categoryBreakdown[v.category] = (categoryBreakdown[v.category] || 0) + 1; });

  const filteredActions = actions.filter((a) => (!priority || a.severity === priority) && (!actionStatus || a.status === actionStatus));
  const overdueActions = filteredActions
    .filter((a) => a.status !== 'completed' && a.status !== 'verified' && new Date(a.due_date) < new Date())
    .map((a) => ({
      id: a.id, outlet: a.outlet_name, category: a.category, severity: a.severity,
      owner: a.owner, dueDate: a.due_date, status: a.status,
    }));

  res.json({
    kpis: { complianceScorePct: avgCompliance, openIssues, checklistScorePct: avgChecklist, avgClosureDays },
    severityBreakdown,
    categoryBreakdown,
    complianceByOutlet,
    overdueActions,
    pendingActions: filteredActions.filter((a) => a.status === 'pending' || a.status === 'in_progress').map((a) => ({
      id: a.id, outlet: a.outlet_name, category: a.category, severity: a.severity, owner: a.owner, dueDate: a.due_date, status: a.status,
    })),
    filters: { priority, actionStatus },
    recentAudits: audits.slice(0, 15).map((a) => ({
      id: a.id, outlet: a.outlet_name, outletCode: a.outlet_code, date: a.date,
      auditor: a.auditor, score: a.score, status: a.status,
    })),
    recentViolations: violations.slice(0, 20).map((v) => ({
      id: v.id, outlet: v.outlet_name, category: v.category, severity: v.severity,
      description: v.description, status: v.status, detectedAt: v.detected_at,
    })),
  });
});

router.patch('/actions/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['pending', 'in_progress', 'completed', 'verified'];
  if (!Number.isInteger(id) || !allowed.includes(status)) return res.status(400).json({ error: 'A valid action status is required.' });
  if (!db.prepare('SELECT id FROM corrective_actions WHERE id = ?').get(id)) return res.status(404).json({ error: 'Corrective action not found.' });
  db.prepare(`UPDATE corrective_actions SET status = ?, closed_at = CASE WHEN ? IN ('completed','verified') THEN COALESCE(closed_at, datetime('now')) ELSE NULL END WHERE id = ?`).run(status, status, id);
  res.json({ id, status });
});

module.exports = router;

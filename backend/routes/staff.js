const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const outletId = req.query.outlet_id ? Number(req.query.outlet_id) : null;
  const where = outletId ? 'WHERE s.outlet_id = ?' : '';
  const params = outletId ? [outletId] : [];

  const all = db.prepare(`SELECT s.*, o.name AS outlet_name, o.code AS outlet_code FROM staff s JOIN outlets o ON o.id = s.outlet_id ${where}`).all(...params);
  const active = all.filter((s) => s.status === 'active' || s.status === 'on_leave');
  const headcount = active.length;
  const avgAttendance = headcount ? Math.round((active.reduce((s, r) => s + r.attendance_pct, 0) / headcount) * 10) / 10 : 0;
  const avgProductivity = headcount ? Math.round((active.reduce((s, r) => s + r.productivity_pct, 0) / headcount) * 10) / 10 : 0;
  const avgOvertime = headcount ? Math.round((active.reduce((s, r) => s + r.overtime_hours_month, 0) / headcount) * 10) / 10 : 0;
  const avgSalesPerEmployee = headcount ? Math.round(active.reduce((s, r) => s + r.sales_per_employee, 0) / headcount) : 0;
  const exited = all.filter((s) => s.status === 'exited').length;
  const turnoverPct = all.length ? Math.round((exited / all.length) * 1000) / 10 : 0;
  const absenteeismPct = Math.round((100 - avgAttendance) * 10) / 10;

  const shiftCoverage = ['Morning', 'Evening', 'Night'].map((shift) => ({
    shift, headcount: active.filter((s) => s.shift === shift).length,
  }));

  const roleDistribution = {};
  active.forEach((s) => { roleDistribution[s.role] = (roleDistribution[s.role] || 0) + 1; });

  const productivityByOutlet = db.prepare(`
    SELECT o.name, o.code, ROUND(AVG(s.productivity_pct),1) AS avg_productivity, ROUND(AVG(s.attendance_pct),1) AS avg_attendance, COUNT(*) AS headcount
    FROM staff s JOIN outlets o ON o.id = s.outlet_id
    WHERE s.status IN ('active','on_leave')
    GROUP BY o.id ORDER BY avg_productivity DESC
  `).all();

  const roster = active
    .sort((a, b) => b.productivity_pct - a.productivity_pct)
    .slice(0, 25)
    .map((s) => ({
      name: s.name, role: s.role, outlet: s.outlet_name, outletCode: s.outlet_code, shift: s.shift,
      attendancePct: s.attendance_pct, productivityPct: s.productivity_pct,
      overtimeHours: s.overtime_hours_month, status: s.status,
    }));

  res.json({
    kpis: { headcount, avgAttendance, avgProductivity, absenteeismPct, avgOvertime, avgSalesPerEmployee, turnoverPct },
    shiftCoverage,
    roleDistribution,
    productivityByOutlet,
    roster,
  });
});

module.exports = router;

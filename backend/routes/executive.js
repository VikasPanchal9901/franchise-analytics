const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { periodWindows, pctChange } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

// Weighted health score per the Franchise Intelligence Engine model:
// 30% Sales, 20% Operations (staff), 15% Audit, 15% Customer, 10% Finance (margin), 10% Inventory
router.get('/summary', (req, res) => {
  const outlets = db.prepare('SELECT * FROM outlets').all();
  const { currentStart, prevStart, prevEnd } = periodWindows(30);

  const salesByOutlet = Object.fromEntries(db.prepare(`
    SELECT outlet_id, SUM(CASE WHEN date >= ? THEN revenue ELSE 0 END) AS current_sales,
      SUM(CASE WHEN date >= ? AND date < ? THEN revenue ELSE 0 END) AS prev_sales
    FROM sales GROUP BY outlet_id
  `).all(currentStart, prevStart, prevEnd).map((r) => [r.outlet_id, r]));

  const costByOutlet = Object.fromEntries(db.prepare(`
    SELECT s.outlet_id, SUM(s.quantity * p.unit_cost) AS cost
    FROM sales s JOIN products p ON p.id = s.product_id WHERE s.date >= ? GROUP BY s.outlet_id
  `).all(currentStart).map((r) => [r.outlet_id, r.cost]));

  const staffByOutlet = Object.fromEntries(db.prepare(`
    SELECT outlet_id, ROUND(AVG(productivity_pct),1) AS productivity, ROUND(AVG(attendance_pct),1) AS attendance
    FROM staff WHERE status IN ('active','on_leave') GROUP BY outlet_id
  `).all().map((r) => [r.outlet_id, r]));

  const auditByOutlet = Object.fromEntries(db.prepare(`
    SELECT outlet_id, ROUND(AVG(score),1) AS avg_score FROM audits GROUP BY outlet_id
  `).all().map((r) => [r.outlet_id, r.avg_score]));

  const openViolationsByOutlet = {};
  db.prepare(`SELECT outlet_id, severity, status FROM violations WHERE status IN ('open','in_progress')`).all()
    .forEach((v) => { openViolationsByOutlet[v.outlet_id] = openViolationsByOutlet[v.outlet_id] || []; openViolationsByOutlet[v.outlet_id].push(v); });

  const invByOutlet = {};
  db.prepare(`SELECT outlet_id, stock_on_hand, reorder_level, avg_daily_sales FROM inventory`).all().forEach((r) => {
    invByOutlet[r.outlet_id] = invByOutlet[r.outlet_id] || [];
    invByOutlet[r.outlet_id].push(r);
  });

  const franchises = outlets.map((o) => {
    const sales = salesByOutlet[o.id] || { current_sales: 0, prev_sales: 0 };
    const cost = costByOutlet[o.id] || 0;
    const staff = staffByOutlet[o.id] || { productivity: 0, attendance: 0 };
    const auditScore = auditByOutlet[o.id] ?? 70;
    const margin = sales.current_sales > 0 ? ((sales.current_sales - cost) / sales.current_sales) * 100 : 0;
    const inv = invByOutlet[o.id] || [];
    const stockoutItems = inv.filter((r) => r.stock_on_hand <= r.reorder_level);
    const inventoryHealthPct = inv.length ? 100 - (stockoutItems.length / inv.length) * 100 : 100;

    const salesScore = Math.max(0, Math.min(100, (sales.current_sales / o.target_monthly_sales) * 100));
    const opsScore = staff.productivity || 0;
    const auditComponent = auditScore;
    const customerScore = (o.customer_rating / 5) * 100;
    const financeScore = Math.max(0, Math.min(100, margin * 3.2)); // margin ~30% maps near 100
    const inventoryScore = inventoryHealthPct;

    const healthScore = Math.round(
      salesScore * 0.30 + opsScore * 0.20 + auditComponent * 0.15 + customerScore * 0.15 + financeScore * 0.10 + inventoryScore * 0.10
    );
    const classification = healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Watch' : healthScore >= 40 ? 'At Risk' : 'Critical';

    // Rule-based risk detection
    const risks = [];
    if (sales.prev_sales > 0 && sales.current_sales < sales.prev_sales * 0.95) {
      const decline = Math.round((1 - sales.current_sales / sales.prev_sales) * 100);
      risks.push({ type: 'Revenue risk', detail: `Sales declined ${decline}% vs the prior 30-day period.`, probabilityPct: Math.min(95, 50 + decline * 2) });
    }
    const criticalStockouts = stockoutItems.length;
    if (criticalStockouts >= 3) {
      risks.push({ type: 'Inventory disruption', detail: `${criticalStockouts} SKUs are at or below reorder level.`, probabilityPct: Math.min(95, 40 + criticalStockouts * 6) });
    }
    const openViolations = openViolationsByOutlet[o.id] || [];
    if (openViolations.length > 0) {
      const hasCritical = openViolations.some((v) => v.severity === 'Critical');
      risks.push({ type: 'Compliance risk', detail: `${openViolations.length} open audit violation(s)${hasCritical ? ', including a critical finding' : ''}.`, probabilityPct: hasCritical ? 85 : Math.min(80, 35 + openViolations.length * 10) });
    }
    if (staff.attendance && staff.attendance < 85) {
      risks.push({ type: 'Staffing risk', detail: `Average attendance is ${staff.attendance}%, below the 85% target.`, probabilityPct: Math.min(90, 100 - staff.attendance) });
    }

    // Growth opportunity (simple rule: weekend vs weekday sales lift)
    const weekendRows = db.prepare(`SELECT date, revenue FROM sales WHERE outlet_id = ? AND date >= ?`).all(o.id, currentStart);
    let weekendRev = 0, weekdayRev = 0, weekendDays = 0, weekdayDays = 0;
    const byDate = {};
    weekendRows.forEach((r) => { byDate[r.date] = (byDate[r.date] || 0) + r.revenue; });
    Object.entries(byDate).forEach(([date, rev]) => {
      const dow = new Date(date).getDay();
      if (dow === 0 || dow === 6) { weekendRev += rev; weekendDays++; } else { weekdayRev += rev; weekdayDays++; }
    });
    const weekendAvg = weekendDays ? weekendRev / weekendDays : 0;
    const weekdayAvg = weekdayDays ? weekdayRev / weekdayDays : 0;
    let opportunity = null;
    if (weekendAvg > weekdayAvg * 1.15) {
      const liftPct = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
      opportunity = { area: 'Weekend demand', detail: `Weekend average revenue is ${liftPct}% higher than weekdays — inventory and staffing may be under-provisioned for weekend footfall.`, estimatedImpactPct: Math.min(20, Math.round(liftPct / 3)) };
    }

    // Recommendation (combine top risk)
    let recommendation = null;
    if (risks.length) {
      const top = risks.sort((a, b) => b.probabilityPct - a.probabilityPct)[0];
      const actionMap = {
        'Revenue risk': 'Review product mix and discounting; align with the marketing team on a targeted local promotion.',
        'Inventory disruption': 'Raise emergency reorders for the affected SKUs and review the reorder threshold.',
        'Compliance risk': 'Assign a corrective action owner and schedule a follow-up audit within 7 days.',
        'Staffing risk': 'Review the shift roster against demand and address attendance gaps with the store manager.',
      };
      recommendation = { priority: top.probabilityPct >= 70 ? 'High' : 'Medium', action: actionMap[top.type] || 'Investigate root cause with the outlet manager.', owner: o.manager_name, basedOn: top.type };
    }

    return {
      id: o.id, code: o.code, name: o.name, city: o.city, region: o.region,
      healthScore, classification,
      components: {
        sales: Math.round(salesScore), operations: Math.round(opsScore), audit: Math.round(auditComponent),
        customer: Math.round(customerScore), finance: Math.round(financeScore), inventory: Math.round(inventoryScore),
      },
      monthlySales: Math.round(sales.current_sales),
      risks, opportunity, recommendation,
    };
  });

  const totalSales = franchises.reduce((s, f) => s + f.monthlySales, 0);
  const totalPrevSales = Object.values(salesByOutlet).reduce((s, r) => s + r.prev_sales, 0);
  const atRiskCount = franchises.filter((f) => f.classification === 'At Risk' || f.classification === 'Critical').length;
  const avgTargetPct = Math.round((outlets.reduce((s, o) => s + ((salesByOutlet[o.id]?.current_sales || 0) / o.target_monthly_sales) * 100, 0) / outlets.length) * 10) / 10;
  const networkTrend = db.prepare(`SELECT date, ROUND(SUM(revenue)) AS revenue FROM sales WHERE date >= ? GROUP BY date ORDER BY date ASC`).all(currentStart);

  res.json({
    kpis: {
      networkSales: Math.round(totalSales),
      growthPct: pctChange(totalSales, totalPrevSales),
      avgTargetPct,
      atRiskOutlets: atRiskCount,
    },
    networkTrend,
    franchises: franchises.sort((a, b) => a.healthScore - b.healthScore),
  });
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { periodWindows } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const outletId = req.query.outlet_id ? Number(req.query.outlet_id) : null;
  const where = outletId ? 'WHERE i.outlet_id = ?' : '';
  const params = outletId ? [outletId] : [];

  const rows = db.prepare(`
    SELECT i.*, p.name AS product_name, p.category, p.unit_price, o.name AS outlet_name, o.code AS outlet_code
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    JOIN outlets o ON o.id = i.outlet_id
    ${where}
  `).all(...params);

  const totalUnits = rows.reduce((s, r) => s + r.stock_on_hand, 0);
  const stockCoverDays = rows.length
    ? Math.round((rows.reduce((s, r) => s + (r.avg_daily_sales > 0 ? r.stock_on_hand / r.avg_daily_sales : 0), 0) / rows.length) * 10) / 10
    : 0;
  const belowReorder = rows.filter((r) => r.stock_on_hand <= r.reorder_level);
  const stockoutRatePct = rows.length ? Math.round((belowReorder.length / rows.length) * 1000) / 10 : 0;
  const totalWastageUnits = rows.reduce((s, r) => s + r.wastage_units_30d, 0);
  const totalUnitsSold30d = rows.reduce((s, r) => s + r.avg_daily_sales * 30, 0);
  const wastagePct = totalUnitsSold30d > 0 ? Math.round((totalWastageUnits / totalUnitsSold30d) * 1000) / 10 : 0;

  // ABC analysis by revenue contribution (30-day)
  const { currentStart } = periodWindows(30);
  const revenueByProduct = db.prepare(`
    SELECT p.id, p.name, SUM(s.revenue) AS revenue
    FROM sales s JOIN products p ON p.id = s.product_id
    ${outletId ? 'WHERE s.outlet_id = ? AND s.date >= ?' : 'WHERE s.date >= ?'}
    GROUP BY p.id ORDER BY revenue DESC
  `).all(...(outletId ? [outletId, currentStart] : [currentStart]));
  const totalRevenue = revenueByProduct.reduce((s, r) => s + r.revenue, 0) || 1;
  let cumulative = 0;
  const abc = revenueByProduct.map((r) => {
    cumulative += r.revenue;
    const cumulativePct = (cumulative / totalRevenue) * 100;
    const cls = cumulativePct <= 70 ? 'A' : cumulativePct <= 90 ? 'B' : 'C';
    return { name: r.name, revenue: Math.round(r.revenue), cumulativePct: Math.round(cumulativePct * 10) / 10, class: cls };
  });

  const reorderAlerts = belowReorder
    .map((r) => ({
      outlet: r.outlet_name, outletCode: r.outlet_code, product: r.product_name,
      stockOnHand: r.stock_on_hand, reorderLevel: r.reorder_level,
      daysOfCover: r.avg_daily_sales > 0 ? Math.round((r.stock_on_hand / r.avg_daily_sales) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.daysOfCover - b.daysOfCover)
    .slice(0, 15);

  // stock aging buckets by days since last restock
  const agingBuckets = { '0-3 days': 0, '4-7 days': 0, '8-14 days': 0, '15+ days': 0 };
  rows.forEach((r) => {
    const days = Math.round((Date.now() - new Date(r.last_restocked).getTime()) / 86400000);
    if (days <= 3) agingBuckets['0-3 days']++;
    else if (days <= 7) agingBuckets['4-7 days']++;
    else if (days <= 14) agingBuckets['8-14 days']++;
    else agingBuckets['15+ days']++;
  });

  const outletWise = db.prepare(`
    SELECT o.id, o.name, o.code, SUM(i.stock_on_hand) AS units, ROUND(AVG(i.stock_on_hand * 1.0 / NULLIF(i.avg_daily_sales,0)),1) AS avg_cover
    FROM inventory i JOIN outlets o ON o.id = i.outlet_id
    GROUP BY o.id ORDER BY o.name
  `).all();

  res.json({
    kpis: { totalUnits, stockCoverDays, stockoutRatePct, wastagePct },
    reorderAlerts,
    abc,
    agingBuckets,
    outletWise,
  });
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { periodWindows, pctChange } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

// GET /api/outlets/summary — KPI cards + ranking + trend for the Outlet Performance Dashboard
router.get('/summary', (req, res) => {
  const { currentStart, today, prevStart, prevEnd } = periodWindows(30);
  const outlets = db.prepare('SELECT * FROM outlets').all();

  const salesByOutlet = db.prepare(`
    SELECT outlet_id,
      SUM(CASE WHEN date >= ? THEN revenue ELSE 0 END) AS current_sales,
      SUM(CASE WHEN date >= ? AND date < ? THEN revenue ELSE 0 END) AS prev_sales,
      SUM(CASE WHEN date >= ? THEN quantity ELSE 0 END) AS current_txns
    FROM sales GROUP BY outlet_id
  `).all(currentStart, prevStart, prevEnd, currentStart);
  const salesMap = Object.fromEntries(salesByOutlet.map((r) => [r.outlet_id, r]));

  const costByOutlet = db.prepare(`
    SELECT s.outlet_id, SUM(s.quantity * p.unit_cost) AS current_cost
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.date >= ?
    GROUP BY s.outlet_id
  `).all(currentStart);
  const costMap = Object.fromEntries(costByOutlet.map((r) => [r.outlet_id, r.current_cost]));

  const ranked = outlets.map((o) => {
    const s = salesMap[o.id] || { current_sales: 0, prev_sales: 0, current_txns: 0 };
    const cost = costMap[o.id] || 0;
    const margin = s.current_sales > 0 ? Math.round(((s.current_sales - cost) / s.current_sales) * 1000) / 10 : 0;
    const targetAchievement = o.target_monthly_sales > 0 ? Math.round((s.current_sales / o.target_monthly_sales) * 1000) / 10 : 0;
    return {
      id: o.id, code: o.code, name: o.name, city: o.city, region: o.region, status: o.status,
      manager: o.manager_name, rating: o.customer_rating,
      monthlySales: Math.round(s.current_sales),
      salesGrowthPct: pctChange(s.current_sales, s.prev_sales),
      transactions: s.current_txns,
      avgOrderValue: s.current_txns > 0 ? Math.round((s.current_sales / s.current_txns) * 100) / 100 : 0,
      grossMarginPct: margin,
      targetAchievementPct: targetAchievement,
      targetMonthlySales: o.target_monthly_sales,
    };
  }).sort((a, b) => b.monthlySales - a.monthlySales);

  const totalSales = ranked.reduce((sum, o) => sum + o.monthlySales, 0);
  const totalPrevSales = Object.values(salesMap).reduce((sum, r) => sum + r.prev_sales, 0);
  const avgRating = ranked.length ? Math.round((ranked.reduce((s, o) => s + o.rating, 0) / ranked.length) * 10) / 10 : 0;
  const avgMargin = ranked.length ? Math.round((ranked.reduce((s, o) => s + o.grossMarginPct, 0) / ranked.length) * 10) / 10 : 0;
  const avgTarget = ranked.length ? Math.round((ranked.reduce((s, o) => s + o.targetAchievementPct, 0) / ranked.length) * 10) / 10 : 0;

  // Daily sales trend across network, last 30 days
  const trend = db.prepare(`
    SELECT date, ROUND(SUM(revenue)) AS revenue FROM sales
    WHERE date >= ? GROUP BY date ORDER BY date ASC
  `).all(currentStart);

  res.json({
    kpis: {
      totalMonthlySales: totalSales,
      salesGrowthPct: pctChange(totalSales, totalPrevSales),
      avgGrossMarginPct: avgMargin,
      avgCustomerRating: avgRating,
      avgTargetAchievementPct: avgTarget,
    },
    ranking: ranked,
    trend,
  });
});

// GET /api/outlets — plain list (used by filters in other modules)
router.get('/', (req, res) => {
  const outlets = db.prepare('SELECT id, code, name, city, region, status, manager_name FROM outlets ORDER BY name').all();
  res.json({ outlets });
});

// GET /api/outlets/:id — single outlet detail with 30-day trend and top products
router.get('/:id', (req, res) => {
  const outlet = db.prepare('SELECT * FROM outlets WHERE id = ?').get(req.params.id);
  if (!outlet) return res.status(404).json({ error: 'Outlet not found.' });
  const { currentStart } = periodWindows(30);
  const trend = db.prepare(`SELECT date, ROUND(SUM(revenue)) AS revenue FROM sales WHERE outlet_id = ? AND date >= ? GROUP BY date ORDER BY date ASC`).all(outlet.id, currentStart);
  const topProducts = db.prepare(`
    SELECT p.name, SUM(s.quantity) AS units, ROUND(SUM(s.revenue)) AS revenue
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.outlet_id = ? AND s.date >= ?
    GROUP BY p.id ORDER BY revenue DESC LIMIT 6
  `).all(outlet.id, currentStart);
  res.json({ outlet, trend, topProducts });
});

module.exports = router;

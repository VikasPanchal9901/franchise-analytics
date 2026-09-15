const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { periodWindows, pctChange } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const outletId = req.query.outlet_id ? Number(req.query.outlet_id) : null;
  const days = Number(req.query.days) || 30;
  const { currentStart, prevStart, prevEnd } = periodWindows(days);
  const outletFilter = outletId ? 'AND s.outlet_id = ?' : '';
  const baseParams = outletId ? [outletId] : [];

  const current = db.prepare(`SELECT COALESCE(SUM(revenue),0) AS revenue, COALESCE(SUM(quantity),0) AS units, COUNT(*) AS orders FROM sales s WHERE date >= ? ${outletFilter}`)
    .get(currentStart, ...baseParams);
  const previous = db.prepare(`SELECT COALESCE(SUM(revenue),0) AS revenue FROM sales s WHERE date >= ? AND date < ? ${outletFilter}`)
    .get(prevStart, prevEnd, ...baseParams);
  const discountTotal = db.prepare(`SELECT COALESCE(SUM(discount),0) AS d FROM sales s WHERE date >= ? ${outletFilter}`).get(currentStart, ...baseParams).d;

  const trend = db.prepare(`SELECT date, ROUND(SUM(revenue)) AS revenue, SUM(quantity) AS units FROM sales s WHERE date >= ? ${outletFilter} GROUP BY date ORDER BY date ASC`)
    .all(currentStart, ...baseParams);

  const byCategory = db.prepare(`
    SELECT p.category, ROUND(SUM(s.revenue)) AS revenue, SUM(s.quantity) AS units
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.date >= ? ${outletFilter}
    GROUP BY p.category ORDER BY revenue DESC
  `).all(currentStart, ...baseParams);

  const topProducts = db.prepare(`
    SELECT p.name, p.category, ROUND(SUM(s.revenue)) AS revenue, SUM(s.quantity) AS units
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.date >= ? ${outletFilter}
    GROUP BY p.id ORDER BY revenue DESC LIMIT 8
  `).all(currentStart, ...baseParams);

  const bottomProducts = db.prepare(`
    SELECT p.name, p.category, ROUND(SUM(s.revenue)) AS revenue, SUM(s.quantity) AS units
    FROM sales s JOIN products p ON p.id = s.product_id
    WHERE s.date >= ? ${outletFilter}
    GROUP BY p.id ORDER BY revenue ASC LIMIT 5
  `).all(currentStart, ...baseParams);

  const byOutlet = outletId ? [] : db.prepare(`
    SELECT o.name, o.code, ROUND(SUM(s.revenue)) AS revenue
    FROM sales s JOIN outlets o ON o.id = s.outlet_id
    WHERE s.date >= ?
    GROUP BY o.id ORDER BY revenue DESC
  `).all(currentStart);

  res.json({
    kpis: {
      totalRevenue: Math.round(current.revenue),
      totalUnits: current.units,
      totalOrders: current.orders,
      avgOrderValue: current.orders > 0 ? Math.round((current.revenue / current.orders) * 100) / 100 : 0,
      revenueGrowthPct: pctChange(current.revenue, previous.revenue),
      totalDiscountGiven: Math.round(discountTotal),
    },
    trend, byCategory, topProducts, bottomProducts, byOutlet,
  });
});

module.exports = router;

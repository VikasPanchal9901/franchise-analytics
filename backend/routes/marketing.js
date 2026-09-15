const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/campaigns', (req, res) => {
  const { name, channel, startDate, endDate, budget } = req.body || {};
  const allowedChannels = ['Instagram', 'Google Ads', 'SMS', 'Email', 'In-store'];
  const numericBudget = Number(budget);
  if (!name || !allowedChannels.includes(channel) || !startDate || !endDate || !Number.isFinite(numericBudget) || numericBudget <= 0) {
    return res.status(400).json({ error: 'Name, valid channel, dates, and a positive budget are required.' });
  }
  if (endDate < startDate) return res.status(400).json({ error: 'End date must be on or after start date.' });
  const result = db.prepare(`
    INSERT INTO campaigns (name, channel, start_date, end_date, budget, spend, impressions, clicks, leads, conversions, revenue, status)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 'active')
  `).run(name.trim(), channel, startDate, endDate, Math.round(numericBudget * 100) / 100);
  res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Campaign created. Add performance metrics as results arrive.' });
});

router.get('/summary', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY start_date DESC').all();

  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  const roas = totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0;
  const conversionRatePct = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 1000) / 10 : 0;
  const cac = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0;
  const ctrPct = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0;

  const channelPerformance = {};
  campaigns.forEach((c) => {
    if (!channelPerformance[c.channel]) channelPerformance[c.channel] = { channel: c.channel, spend: 0, revenue: 0, conversions: 0 };
    channelPerformance[c.channel].spend += c.spend;
    channelPerformance[c.channel].revenue += c.revenue;
    channelPerformance[c.channel].conversions += c.conversions;
  });

  const campaignComparison = campaigns.map((c) => ({
    id: c.id, name: c.name, channel: c.channel, status: c.status,
    budget: c.budget, spend: c.spend, revenue: Math.round(c.revenue),
    roas: c.spend > 0 ? Math.round((c.revenue / c.spend) * 100) / 100 : 0,
    conversions: c.conversions, ctrPct: c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 1000) / 10 : 0,
    startDate: c.start_date, endDate: c.end_date,
  })).sort((a, b) => b.roas - a.roas);

  const funnel = [
    { stage: 'Impressions', value: totalImpressions },
    { stage: 'Clicks', value: totalClicks },
    { stage: 'Leads', value: totalLeads },
    { stage: 'Conversions', value: totalConversions },
  ];

  res.json({
    kpis: { campaignRevenue: Math.round(totalRevenue), roas, conversionRatePct, cac, ctrPct, totalSpend: Math.round(totalSpend) },
    channelPerformance: Object.values(channelPerformance).map((c) => ({
      ...c, spend: Math.round(c.spend), revenue: Math.round(c.revenue),
      roas: c.spend > 0 ? Math.round((c.revenue / c.spend) * 100) / 100 : 0,
    })),
    campaignComparison,
    funnel,
  });
});

module.exports = router;

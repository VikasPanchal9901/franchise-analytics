function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Returns [currentPeriodStart, previousPeriodStart, previousPeriodEnd] as ISO date strings
function periodWindows(days = 30) {
  return {
    currentStart: isoDaysAgo(days),
    today: isoDaysAgo(0),
    prevStart: isoDaysAgo(days * 2),
    prevEnd: isoDaysAgo(days),
  };
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

module.exports = { isoDaysAgo, periodWindows, pctChange };

/**
 * Seed script for FranchiseOps — "Kaffeine Central" coffee & quick-bites franchise.
 * Populates outlets, user-provided Indian retail products and sales history, inventory,
 * marketing campaigns, audits/violations/corrective actions, and notifications.
 *
 * Operating-model records are generated for the demo; sales/products/feedback come from
 * backend/data/supplied. Run once:
 * `npm run seed`. Safe to re-run — it wipes and rebuilds.
 */
const db = require('./db');
const bcrypt = require('bcryptjs');
const { importSuppliedRetail } = require('./data/importSupplied');

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function round2(n) { return Math.round(n * 100) / 100; }
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoDateTimeAgo(hoursAgo) {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const tx = db.transaction(() => {
  // wipe existing data (idempotent re-seed)
  [
    'corrective_actions', 'violations', 'audits', 'notifications',
    'campaigns', 'customer_feedback', 'sales', 'inventory', 'staff', 'outlets', 'products', 'users'
  ].forEach((t) => db.exec(`DELETE FROM ${t}; DELETE FROM sqlite_sequence WHERE name='${t}';`));

  // ---------- USERS ----------
  const demoPasswordHash = bcrypt.hashSync('Demo@1234', 10);
  const insertUser = db.prepare(`INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES (?,?,?,?,?)`);
  insertUser.run('Ananya Rao', 'owner@kaffeinecentral.com', demoPasswordHash, 'owner', null);
  insertUser.run('Rahul Menon', 'regional@kaffeinecentral.com', demoPasswordHash, 'regional_manager', null);
    insertUser.run('Sneha Sharma', 'manager@kaffeinecentral.com', demoPasswordHash, 'manager', 1);

  // ---------- OUTLETS ----------
  const outletSeed = [
    { code: 'BLR-001', name: 'Bengaluru – Indiranagar 100ft', city: 'Bengaluru', region: 'South', mgr: 'Sneha Sharma', lat: 12.9784, lng: 77.6408, target: 500000, profile: 'healthy' },
    { code: 'BLR-017', name: 'Bengaluru – JP Nagar (Outlet 17)', city: 'Bengaluru', region: 'South', mgr: 'Siddharth Verma', lat: 12.9077, lng: 77.5856, target: 520000, profile: 'critical' },
    { code: 'BLR-002', name: 'Bengaluru – Koramangala 5th Block', city: 'Bengaluru', region: 'South', mgr: 'Karthik Nair', lat: 12.9352, lng: 77.6245, target: 510000, profile: 'healthy' },
    { code: 'MUM-001', name: 'Mumbai – Bandra West Linking Rd', city: 'Mumbai', region: 'West', mgr: 'Rohan Kulkarni', lat: 19.0607, lng: 72.8362, target: 560000, profile: 'healthy' },
    { code: 'MUM-002', name: 'Mumbai – Lower Parel High Street', city: 'Mumbai', region: 'West', mgr: 'Ananya Mehta', lat: 18.9988, lng: 72.8258, target: 480000, profile: 'watch' },
    { code: 'DEL-001', name: 'Delhi – Connaught Place Inner Circle', city: 'Delhi', region: 'North', mgr: 'Harpreet Singh', lat: 28.6315, lng: 77.2167, target: 550000, profile: 'healthy' },
    { code: 'DEL-002', name: 'Delhi – Cyber Hub Gurugram', city: 'Delhi NCR', region: 'North', mgr: 'Amitabh Sen', lat: 28.4950, lng: 77.0890, target: 530000, profile: 'watch' },
    { code: 'HYD-001', name: 'Hyderabad – Hitec City Cyber Towers', city: 'Hyderabad', region: 'South', mgr: 'Prashanth Rao', lat: 17.4435, lng: 78.3772, target: 510000, profile: 'healthy' },
    { code: 'CHN-001', name: 'Chennai – Anna Nagar 2nd Avenue', city: 'Chennai', region: 'South', mgr: 'Deepak Sundaram', lat: 13.0850, lng: 80.2101, target: 460000, profile: 'watch' },
  ];
  const insertOutlet = db.prepare(`INSERT INTO outlets (code,name,city,region,address,manager_name,opened_on,status,lat,lng,target_monthly_sales,customer_rating) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const outletIds = outletSeed.map((o) => {
    const status = o.profile === 'critical' ? 'under_review' : 'active';
    const rating = o.profile === 'critical' ? round2(rand(2.9, 3.6)) : o.profile === 'watch' ? round2(rand(3.7, 4.2)) : round2(rand(4.3, 4.9));
    const info = insertOutlet.run(o.code, o.name, o.city, o.region, `${o.name}, ${o.city}`, o.mgr, isoDaysAgo(randInt(400, 1400)), status, o.lat, o.lng, o.target, rating);
    return { id: info.lastInsertRowid, ...o };
  });

  // ---------- PRODUCTS + SALES + CUSTOMER FEEDBACK (user-provided extract) ----------
  // Products, transactions, and reviews are imported from the supplied datasets;
  // the existing operating-model modules below remain unchanged.
  const dataSource = importSuppliedRetail(db, outletIds);
  const productIds = db.prepare(`SELECT id, name, category, unit_cost AS cost, unit_price AS price FROM products ORDER BY id`).all();

  // ---------- INVENTORY ----------
  const insertInv = db.prepare(`INSERT INTO inventory (outlet_id,product_id,stock_on_hand,reorder_level,avg_daily_sales,wastage_units_30d,last_restocked) VALUES (?,?,?,?,?,?,?)`);
  const importedSalesDays = db.prepare(`SELECT COUNT(DISTINCT date) AS days FROM sales`).get().days || 1;
  const demandByOutletProduct = db.prepare(`
    SELECT COALESCE(SUM(quantity) / ? , 0) AS avg_daily
    FROM sales WHERE outlet_id = ? AND product_id = ?
  `);
  outletIds.forEach((o) => {
    productIds.forEach((p) => {
      const importedDemand = demandByOutletProduct.get(importedSalesDays, o.id, p.id).avg_daily;
      const avgDaily = round2(Math.max(0.5, importedDemand));
      let stock;
      if (o.profile === 'critical' && Math.random() < 0.35) stock = randInt(0, Math.round(avgDaily * 0.8)); // frequent stockouts
      else if (o.profile === 'watch' && Math.random() < 0.2) stock = randInt(0, Math.round(avgDaily * 1.2));
      else stock = randInt(Math.round(avgDaily * 2), Math.round(avgDaily * 9));
      insertInv.run(o.id, p.id, stock, Math.round(avgDaily * 2), avgDaily, randInt(0, 18), isoDaysAgo(randInt(0, 6)));
    });
  });

  // ---------- STAFF ----------
  const roles = ['Store Manager', 'Shift Lead', 'Barista', 'Barista', 'Kitchen Staff', 'Cashier'];
  const firstNames = ['Arjun', 'Meera', 'Vikram', 'Sneha', 'Rohan', 'Anjali', 'Karthik', 'Pooja', 'Sanjay', 'Isha', 'Naveen', 'Ritu', 'Manoj', 'Deepa'];
  const lastNames = ['Nair', 'Iyer', 'Reddy', 'Gupta', 'Bose', 'Verma', 'Pillai', 'Chatterjee', 'Joshi', 'Bhat'];
  const insertStaff = db.prepare(`INSERT INTO staff (outlet_id,name,role,shift,attendance_pct,productivity_pct,overtime_hours_month,sales_per_employee,hire_date,status) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  outletIds.forEach((o) => {
    const headcount = randInt(6, 9);
    for (let i = 0; i < headcount; i++) {
      const role = i === 0 ? 'Store Manager' : pick(roles);
      const attendance = o.profile === 'critical' ? rand(68, 84) : o.profile === 'watch' ? rand(78, 90) : rand(88, 98);
      const productivity = o.profile === 'critical' ? rand(55, 72) : o.profile === 'watch' ? rand(68, 80) : rand(78, 94);
      const overtime = o.profile === 'watch' ? rand(14, 30) : rand(2, 16);
      insertStaff.run(
        o.id, `${pick(firstNames)} ${pick(lastNames)}`, role, pick(['Morning', 'Evening', 'Night']),
        round2(attendance), round2(productivity), round2(overtime), round2(rand(35000, 95000)),
        isoDaysAgo(randInt(60, 900)), pick(['active', 'active', 'active', 'active', 'active', 'active', 'on_leave', 'exited'])
      );
    }
  });


  // ---------- CAMPAIGNS ----------
  const campaignSeed = [
    ['Monsoon Cold Brew Push', 'Instagram', 45, 8],
    ['Weekend Family Combo', 'Google Ads', 60, 12],
    ['Loyalty App Relaunch', 'Email', 30, 5],
    ['Work-From-Cafe Bundle', 'In-store', 20, 25],
    ['Flash Sale — Bakery Week', 'SMS', 7, 55],
    ['New Store Launch — Salt Lake', 'Google Ads', 21, 18],
  ];
  const insertCampaign = db.prepare(`INSERT INTO campaigns (name,channel,start_date,end_date,budget,spend,impressions,clicks,leads,conversions,revenue,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  campaignSeed.forEach(([name, channel, durationDays, daysAgoStart]) => {
    const budget = round2(rand(40000, 220000));
    const spendRatio = rand(0.6, 1.0);
    const spend = round2(budget * spendRatio);
    const impressions = randInt(20000, 480000);
    const ctr = rand(0.015, 0.06);
    const clicks = Math.round(impressions * ctr);
    const leadRate = rand(0.08, 0.22);
    const leads = Math.round(clicks * leadRate);
    const convRate = rand(0.15, 0.45);
    const conversions = Math.round(leads * convRate);
    const avgOrderValue = rand(280, 520);
    const revenue = round2(conversions * avgOrderValue * rand(1.5, 3.2)); // repeat visits factored in
    const status = daysAgoStart < durationDays ? 'active' : 'completed';
    insertCampaign.run(name, channel, isoDaysAgo(daysAgoStart + durationDays), isoDaysAgo(daysAgoStart), budget, spend, impressions, clicks, leads, conversions, revenue, status);
  });

  // ---------- AUDITS / VIOLATIONS / CORRECTIVE ACTIONS ----------
  const violationCatalog = [
    ['Hygiene', 'Critical', 'Expired dairy stock found in walk-in chiller'],
    ['Hygiene', 'High', 'Floor and counter cleaning log not updated for 3 days'],
    ['Staffing', 'Medium', 'Shift attendance register shows unexplained gaps'],
    ['Staffing', 'High', 'Store opened 40 minutes past scheduled time'],
    ['Cash Handling', 'High', 'Unauthorized discount applied without manager approval'],
    ['Cash Handling', 'Critical', 'End-of-day cash reconciliation mismatch exceeding ₹2,000'],
    ['Inventory', 'Medium', 'Stock count in POS does not match physical count'],
    ['Inventory', 'Low', 'Reorder not raised despite low-stock alert'],
    ['Branding', 'Low', 'Signage lighting not functional at entrance'],
    ['Documentation', 'Medium', 'GST invoice missing for 2 supplier deliveries'],
    ['Documentation', 'Low', 'Customer complaint log not updated within SLA'],
  ];
  const auditors = ['Meera Krishnan', 'Suresh Iyer', 'Fatima Sheikh'];
  const insertAudit = db.prepare(`INSERT INTO audits (outlet_id,date,auditor,score,checklist_score,status) VALUES (?,?,?,?,?,?)`);
  const insertViolation = db.prepare(`INSERT INTO violations (audit_id,outlet_id,category,severity,description,status,detected_at) VALUES (?,?,?,?,?,?,?)`);
  const insertAction = db.prepare(`INSERT INTO corrective_actions (violation_id,owner,due_date,status,action_taken,closed_at) VALUES (?,?,?,?,?,?)`);

  outletIds.forEach((o) => {
    const auditCount = randInt(2, 4);
    for (let i = 0; i < auditCount; i++) {
      const daysAgo = randInt(1, 85);
      const baseScore = o.profile === 'critical' ? randInt(52, 70) : o.profile === 'watch' ? randInt(68, 84) : randInt(85, 98);
      const auditInfo = insertAudit.run(o.id, isoDaysAgo(daysAgo), pick(auditors), baseScore, Math.min(100, baseScore + randInt(-3, 5)), 'completed');
      const auditId = auditInfo.lastInsertRowid;
      const violCount = o.profile === 'critical' ? randInt(2, 4) : o.profile === 'watch' ? randInt(1, 2) : randInt(0, 1);
      for (let v = 0; v < violCount; v++) {
        const [category, severity, description] = pick(violationCatalog);
        const resolved = Math.random() < 0.6;
        const vStatus = resolved ? pick(['verified', 'closed']) : pick(['open', 'in_progress']);
        const vInfo = insertViolation.run(auditId, o.id, category, severity, description, vStatus, isoDaysAgo(daysAgo));
        const violationId = vInfo.lastInsertRowid;
        const dueDate = isoDaysAgo(daysAgo - randInt(3, 10));
        insertAction.run(
          violationId, o.mgr, dueDate,
          resolved ? 'completed' : pick(['pending', 'in_progress']),
          resolved ? 'Corrective steps verified during follow-up visit.' : null,
          resolved ? isoDaysAgo(Math.max(0, daysAgo - randInt(4, 12))) : null
        );
      }
    }
  });

  // ---------- NOTIFICATIONS ----------
  const eventCatalog = [
    ['low_stock', 'high', 'Low stock cover on fast-moving item', 'Cold Brew has less than 1 day of stock cover.'],
    ['attendance', 'medium', 'Attendance gap detected', 'Morning shift is short-staffed by 2 team members.'],
    ['compliance', 'critical', 'Critical audit violation logged', 'Expired stock found during surprise audit — immediate action required.'],
    ['sales_dip', 'medium', 'Sales trending below target', 'Weekly sales are 14% below the monthly target pace.'],
    ['payment', 'high', 'Vendor payment overdue', 'Supplier invoice is overdue by 5 days — risk of delivery hold.'],
    ['incident', 'critical', 'Customer incident reported', 'A customer complaint escalated regarding food quality.'],
    ['campaign', 'low', 'Campaign performance update', 'Weekend Family Combo campaign crossed 4x ROAS.'],
  ];
  const channelsForPriority = { low: 'email', medium: 'push', high: 'push', critical: 'sms' };
  const insertNotif = db.prepare(`INSERT INTO notifications (outlet_id,event_type,channel,priority,title,message,status,created_at,acknowledged_at,escalated_at,resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  for (let i = 0; i < 55; i++) {
    const o = pick(outletIds);
    const [eventType, priority, title, message] = pick(eventCatalog);
    const hoursAgo = randInt(0, 720); // last 30 days
    const created = isoDateTimeAgo(hoursAgo);
    let status = 'sent', ack = null, esc = null, res = null;
    const roll = Math.random();
    if (hoursAgo > 2) {
      if (roll < 0.55) { status = 'resolved'; ack = isoDateTimeAgo(hoursAgo - randInt(0, 1)); res = isoDateTimeAgo(Math.max(0, hoursAgo - randInt(2, 20))); }
      else if (roll < 0.75) { status = 'acknowledged'; ack = isoDateTimeAgo(hoursAgo - randInt(0, 1)); }
      else if (roll < 0.88 && (priority === 'high' || priority === 'critical')) { status = 'escalated'; esc = isoDateTimeAgo(hoursAgo - randInt(1, 3)); }
    }
    insertNotif.run(o.id, eventType, channelsForPriority[priority], priority, title, message, status, created, ack, esc, res);
  }
});

tx();

console.log('✔ Database seeded from the supplied Indian retail sales and customer feedback datasets, plus operating-model modules.');
console.log('  Demo login → email: manager@kaffeinecentral.com  password: Demo@1234');
console.log('  (Also seeded: owner@kaffeinecentral.com, regional@kaffeinecentral.com — same password)');
